import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';
import { takeoffEngine } from '@/lib/takeoff/client';
import { ACTIVE_JOB_STATUSES } from '@/lib/takeoff/types';

type RouteContext = { params: Promise<{ id: string; jobId: string }> };

/**
 * GET /api/estimates/:id/takeoff/:jobId — Job status with backup sync.
 *
 * Returns the job record from Supabase. If the engine reports completion
 * but Supabase has no draft lines, syncs results from engine (backup path).
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id, jobId } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: job, error } = await supabase
    .from('takeoff_jobs')
    .select('*, takeoff_plans(id, filename, storage_path)')
    .eq('id', jobId)
    .eq('estimate_id', id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: 'Takeoff job not found' }, { status: 404 });
  }

  // Backup sync: if job is active, poll engine for latest status
  const engineJobId = (job.config as Record<string, unknown>)?.engine_job_id as string | undefined;
  if (engineJobId && ACTIVE_JOB_STATUSES.includes(job.status as never)) {
    try {
      const engineStatus = await takeoffEngine.getJobStatus(engineJobId);
      const newStatus = engineStatus.status as string;

      if (newStatus !== job.status) {
        await supabase
          .from('takeoff_jobs')
          .update({
            status: newStatus,
            summary: (engineStatus.summary as Record<string, unknown>) ?? null,
            error_message: (engineStatus.error as string) ?? null,
            started_at: (engineStatus.started_at as string) ?? job.started_at,
            completed_at: (engineStatus.completed_at as string) ?? null,
          })
          .eq('id', jobId);

        // If engine says completed but no draft lines in DB, sync them
        if (newStatus === 'completed') {
          const { count } = await supabase
            .from('takeoff_draft_lines')
            .select('id', { count: 'exact', head: true })
            .eq('job_id', jobId);

          if (!count || count === 0) {
            await syncLinesFromEngine(supabase, jobId, engineJobId);
          }
        }

        return NextResponse.json({ ...job, status: newStatus });
      }
    } catch (err) {
      logger.warn('Failed to poll engine for job status', {
        jobId,
        engineJobId,
        error: err instanceof Error ? err.message : String(err),
      });
      // Non-fatal — return Supabase state
    }
  }

  return NextResponse.json(job);
}

/**
 * POST /api/estimates/:id/takeoff/:jobId — Cancel a job.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, jobId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.action !== 'cancel') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: job, error } = await supabase
    .from('takeoff_jobs')
    .select('id, status, config')
    .eq('id', jobId)
    .eq('estimate_id', id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: 'Takeoff job not found' }, { status: 404 });
  }

  if (!ACTIVE_JOB_STATUSES.includes(job.status as never)) {
    return NextResponse.json({ error: 'Job is not cancellable' }, { status: 400 });
  }

  // Cancel on engine
  const engineJobId = (job.config as Record<string, unknown>)?.engine_job_id as string | undefined;
  if (engineJobId) {
    try {
      await takeoffEngine.cancelJob(engineJobId);
    } catch (err) {
      logger.warn('Failed to cancel job on engine', {
        jobId,
        engineJobId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Update Supabase regardless (engine cancel is best-effort)
  await supabase.from('takeoff_jobs').update({ status: 'cancelled' }).eq('id', jobId);

  return NextResponse.json({ success: true, status: 'cancelled' });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function syncLinesFromEngine(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  jobId: string,
  engineJobId: string,
): Promise<void> {
  try {
    const [enginePages, engineLines] = await Promise.all([
      takeoffEngine.getJobPages(engineJobId),
      takeoffEngine.getJobLines(engineJobId),
    ]);

    // Get first plan for page FK
    const { data: plans } = await supabase
      .from('takeoff_plans')
      .select('id')
      .eq('job_id', jobId)
      .limit(1);
    const planId = plans?.[0]?.id;

    if (enginePages.length > 0 && planId) {
      const pageRecords = enginePages.map((p: Record<string, unknown>) => ({
        job_id: jobId,
        plan_id: planId,
        page_number: p.page_number,
        page_type: p.page_type,
        page_type_confidence: p.page_type_confidence ?? null,
        scale: p.scale ?? null,
        thumbnail_path: p.thumbnail_path ?? null,
        extraction_data: p.extraction_data ?? null,
      }));
      await supabase.from('takeoff_pages').insert(pageRecords);
    }

    if (engineLines.length > 0) {
      const lineRecords = engineLines.map((l: Record<string, unknown>) => ({
        job_id: jobId,
        trade: l.trade,
        csi_code: l.csi_code ?? null,
        description: l.description,
        unit: l.unit,
        quantity: l.quantity,
        unit_cost: l.unit_cost ?? null,
        cost_source: l.cost_source ?? null,
        confidence: l.confidence,
        source_pages: l.source_pages ?? null,
        source_regions: l.source_regions ?? null,
        notes: l.notes ?? null,
        review_status: 'pending',
      }));
      await supabase.from('takeoff_draft_lines').insert(lineRecords);
    }

    logger.info('Synced takeoff results from engine', {
      jobId,
      pages: enginePages.length,
      lines: engineLines.length,
    });
  } catch (err) {
    logger.error('Failed to sync lines from engine', {
      jobId,
      error: err instanceof Error ? err : undefined,
    });
  }
}
