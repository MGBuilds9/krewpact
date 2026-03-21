/**
 * Takeoff Engine webhook receiver.
 *
 * Receives async status updates when a takeoff job completes.
 * Updates takeoff_jobs, upserts takeoff_pages, and inserts takeoff_draft_lines.
 *
 * Auth: HMAC-SHA256 signature verification via x-takeoff-signature header.
 * Uses service client (bypasses RLS) since webhooks are system-level.
 */

import * as Sentry from '@sentry/nextjs';
import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

// ============================================================
// Schema
// ============================================================

const TakeoffWebhookSchema = z.object({
  job_id: z.string(),
  status: z.string(),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
  error: z.string().optional(),
  summary: z.record(z.string(), z.unknown()).optional(),
  pages: z
    .array(
      z.object({
        page_number: z.number(),
        page_type: z.string(),
        page_type_confidence: z.number().optional(),
        scale: z.string().optional(),
        thumbnail_path: z.string().optional(),
        extraction_data: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional(),
  lines: z
    .array(
      z.object({
        trade: z.string(),
        csi_code: z.string().optional(),
        description: z.string(),
        unit: z.string(),
        quantity: z.number(),
        unit_cost: z.number().optional(),
        cost_source: z.string().optional(),
        confidence: z.number(),
        source_pages: z.array(z.number()).optional(),
        source_regions: z.array(z.record(z.string(), z.unknown())).optional(),
        notes: z.string().optional(),
      }),
    )
    .optional(),
});

type TakeoffWebhookPayload = z.infer<typeof TakeoffWebhookSchema>;

// ============================================================
// Signature verification
// ============================================================

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

// ============================================================
// DB helpers
// ============================================================

async function updateJob(
  supabase: ReturnType<typeof createServiceClient>,
  jobId: string,
  payload: TakeoffWebhookPayload,
): Promise<void> {
  const { error } = await supabase
    .from('takeoff_jobs')
    .update({
      status: payload.status,
      summary: payload.summary ?? null,
      error_message: payload.error ?? null,
      started_at: payload.started_at ?? null,
      completed_at: payload.completed_at ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  if (error) {
    logger.error('Takeoff webhook: failed to update job', { jobId, error: error.message });
  }
}

async function upsertPages(
  supabase: ReturnType<typeof createServiceClient>,
  jobId: string,
  pages: NonNullable<TakeoffWebhookPayload['pages']>,
): Promise<void> {
  const { data: plans } = await supabase
    .from('takeoff_plans')
    .select('id')
    .eq('job_id', jobId)
    .limit(1);
  const planId = plans?.[0]?.id ?? null;
  if (!planId) {
    logger.error('Webhook: no takeoff_plans found for job — skipping page upsert', { jobId });
    return;
  }

  for (const page of pages) {
    const { error } = await supabase.from('takeoff_pages').insert({
      job_id: jobId,
      plan_id: planId,
      page_number: page.page_number,
      page_type: page.page_type,
      page_type_confidence: page.page_type_confidence ?? null,
      scale: page.scale ?? null,
      thumbnail_path: page.thumbnail_path ?? null,
      extraction_data: page.extraction_data ?? null,
    });
    if (error) {
      logger.warn('Takeoff webhook: failed to insert page', {
        jobId,
        pageNumber: page.page_number,
        error: error.message,
      });
    }
  }
}

async function insertLines(
  supabase: ReturnType<typeof createServiceClient>,
  jobId: string,
  lines: NonNullable<TakeoffWebhookPayload['lines']>,
): Promise<void> {
  const rows = lines.map((line) => ({
    job_id: jobId,
    trade: line.trade,
    csi_code: line.csi_code ?? null,
    description: line.description,
    unit: line.unit,
    quantity: line.quantity,
    unit_cost: line.unit_cost ?? null,
    cost_source: line.cost_source ?? null,
    confidence: line.confidence,
    source_pages: line.source_pages ?? null,
    source_regions: line.source_regions ?? null,
    notes: line.notes ?? null,
    review_status: 'pending' as const,
  }));

  const { error } = await supabase.from('takeoff_draft_lines').insert(rows);
  if (error) {
    Sentry.captureMessage('Takeoff webhook: failed to insert draft lines', {
      level: 'error',
      tags: { module: 'takeoff', webhook: 'draft_lines' },
      extra: { jobId, count: rows.length, error: error.message },
    });
    logger.error('Takeoff webhook: failed to insert draft lines', {
      jobId,
      count: rows.length,
      error: error.message,
    });
  }
}

// ============================================================
// Route handler
// ============================================================

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 30, window: '1 m' });
  if (!rl.success) return rateLimitResponse(rl);

  const rawBody = await req.text();

  const signature = req.headers.get('x-takeoff-signature') ?? '';
  const secret = process.env.TAKEOFF_ENGINE_TOKEN;

  if (!secret) {
    logger.error('Takeoff webhook: TAKEOFF_ENGINE_TOKEN not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (!signature || !verifySignature(rawBody, signature, secret)) {
    logger.warn('Takeoff webhook: invalid or missing signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let parsed: TakeoffWebhookPayload;
  try {
    const body: unknown = JSON.parse(rawBody);
    parsed = TakeoffWebhookSchema.parse(body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid payload' },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data: jobs } = await supabase
    .from('takeoff_jobs')
    .select('id, config')
    .in('status', ['pending', 'processing', 'classifying', 'extracting', 'costing']);

  const job = (jobs ?? []).find(
    (j) => (j.config as Record<string, unknown> | null)?.engine_job_id === parsed.job_id,
  );

  if (!job) {
    logger.warn('Takeoff webhook: no matching job found — ignoring', {
      engineJobId: parsed.job_id,
    });
    return NextResponse.json({ ok: true });
  }

  await updateJob(supabase, job.id, parsed);

  if (parsed.pages && parsed.pages.length > 0) {
    await upsertPages(supabase, job.id, parsed.pages);
  }

  if (parsed.lines && parsed.lines.length > 0) {
    await insertLines(supabase, job.id, parsed.lines);
  }

  logger.info('Takeoff webhook: processed', {
    engineJobId: parsed.job_id,
    jobId: job.id,
    status: parsed.status,
    pages: parsed.pages?.length ?? 0,
    lines: parsed.lines?.length ?? 0,
  });

  return NextResponse.json({ ok: true });
}
