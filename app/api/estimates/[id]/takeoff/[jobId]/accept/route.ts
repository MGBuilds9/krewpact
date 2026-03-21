import { auth } from '@clerk/nextjs/server';
import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';

import { getKrewpactUserId } from '@/lib/api/org';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { calculateLineTotal } from '@/lib/estimating/calculations';
import { recalculateParentTotals } from '@/lib/estimating/totals';
import { logger } from '@/lib/logger';
import { queue } from '@/lib/queue/client';
import { JobType } from '@/lib/queue/types';
import { createUserClientSafe } from '@/lib/supabase/server';
import { acceptTakeoffLinesSchema } from '@/lib/validators/takeoff';

type RouteContext = { params: Promise<{ id: string; jobId: string }> };

interface OriginalLine {
  id: string;
  trade: string | null;
  csi_code: string | null;
  description: string;
  unit: string;
  quantity: number;
  unit_cost: number | null;
  confidence: number | null;
  source_pages: unknown[] | null;
}

interface SubmittedLine {
  draft_line_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  markup_pct: number;
}

function hasChanges(original: OriginalLine, submitted: SubmittedLine): boolean {
  return (
    original.description !== submitted.description ||
    Number(original.quantity) !== submitted.quantity ||
    Number(original.unit_cost) !== submitted.unit_cost ||
    original.unit !== submitted.unit
  );
}

/**
 * POST /api/estimates/:id/takeoff/:jobId/accept — Accept reviewed lines into estimate_lines.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id, jobId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = acceptTakeoffLinesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const krewpactUserId = await getKrewpactUserId();
  const now = new Date().toISOString();

  // Fetch originals for metadata + diff
  const { data: originalsRaw } = await supabase
    .from('takeoff_draft_lines')
    .select('id, trade, csi_code, description, unit, quantity, unit_cost, confidence, source_pages')
    .in(
      'id',
      parsed.data.lines.map((l) => l.draft_line_id),
    );

  const originals = new Map<string, OriginalLine>(
    (originalsRaw ?? []).map((o: OriginalLine) => [o.id, o]),
  );

  // Get current max sort_order for this estimate
  const { data: sortRows } = await supabase
    .from('estimate_lines')
    .select('sort_order')
    .eq('estimate_id', id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const maxSortOrder = sortRows?.[0]?.sort_order ?? 0;

  // Build inserts
  const lineInserts = parsed.data.lines.map((line: SubmittedLine, index: number) => {
    const original = originals.get(line.draft_line_id);
    return {
      estimate_id: id,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unit_cost: line.unit_cost,
      markup_pct: line.markup_pct ?? 0,
      line_type: 'item',
      sort_order: maxSortOrder + index + 1,
      is_optional: false,
      line_total: calculateLineTotal(line.quantity, line.unit_cost, line.markup_pct ?? 0),
      metadata: {
        source: 'ai_takeoff',
        takeoff_job_id: jobId,
        takeoff_draft_line_id: line.draft_line_id,
        trade: original?.trade ?? null,
        csi_code: original?.csi_code ?? null,
        confidence: original?.confidence ?? null,
        source_pages: original?.source_pages ?? [],
      },
    };
  });

  const { data: insertedLines, error: insertError } = await supabase
    .from('estimate_lines')
    .insert(lineInserts)
    .select('id, metadata');

  if (insertError || !insertedLines) {
    logger.error('Failed to insert estimate lines from takeoff', {
      estimateId: id,
      jobId,
      error: insertError,
    });
    return NextResponse.json({ error: 'Failed to insert lines' }, { status: 500 });
  }

  // Per-line updates on draft lines + build feedback records
  const feedbackInserts: object[] = [];

  for (let i = 0; i < parsed.data.lines.length; i++) {
    const submitted = parsed.data.lines[i];
    const inserted = insertedLines[i];
    const original = originals.get(submitted.draft_line_id);

    const changed = original ? hasChanges(original, submitted) : false;

    await supabase
      .from('takeoff_draft_lines')
      .update({
        final_line_id: inserted.id,
        review_status: changed ? 'edited' : 'accepted',
        reviewed_by: krewpactUserId ?? null,
        reviewed_at: now,
      })
      .eq('id', submitted.draft_line_id);

    feedbackInserts.push({
      job_id: jobId,
      draft_line_id: submitted.draft_line_id,
      feedback_type: changed ? 'corrected' : 'accepted',
      created_by: krewpactUserId ?? null,
      original_value: original
        ? {
            description: original.description,
            quantity: original.quantity,
            unit: original.unit,
            unit_cost: original.unit_cost,
          }
        : null,
      corrected_value: changed
        ? {
            description: submitted.description,
            quantity: submitted.quantity,
            unit: submitted.unit,
            unit_cost: submitted.unit_cost,
          }
        : null,
    });
  }

  if (feedbackInserts.length > 0) {
    const { error: feedbackError } = await supabase
      .from('takeoff_feedback')
      .insert(feedbackInserts);
    if (feedbackError) {
      logger.warn('Failed to insert takeoff feedback records', { jobId, error: feedbackError });
    }
  }

  const totals = await recalculateParentTotals(supabase, id);

  // Enqueue feedback submission to engine via QStash (fire-and-forget)
  const { data: jobRecord } = await supabase
    .from('takeoff_jobs')
    .select('config')
    .eq('id', jobId)
    .single();
  const engineJobId = (jobRecord?.config as Record<string, unknown>)?.engine_job_id as
    | string
    | undefined;
  if (engineJobId) {
    await queue
      .enqueue(JobType.TakeoffFeedback, {
        entityId: engineJobId,
        userId: krewpactUserId ?? 'system',
        meta: { supabaseJobId: jobId },
      })
      .catch((err) => {
        logger.warn('Failed to enqueue takeoff feedback job', { jobId, error: err });
        Sentry.captureException(err, {
          tags: { module: 'takeoff', action: 'feedback_enqueue' },
          extra: { jobId },
        });
      });
  }

  return NextResponse.json({ accepted_count: parsed.data.lines.length, totals });
}
