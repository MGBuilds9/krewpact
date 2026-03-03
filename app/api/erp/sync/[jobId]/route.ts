import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';

/**
 * GET /api/erp/sync/[jobId] — Get the status of a sync job.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = await context.params;
  const supabase = await createUserClient();

  const { data: job, error } = await supabase
    .from('erp_sync_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: 'Sync job not found' }, { status: 404 });
  }

  // Also fetch sync map entry if it exists
  const jobData = job as Record<string, unknown>;
  const { data: syncMap } = await supabase
    .from('erp_sync_map')
    .select('*')
    .eq('entity_type', jobData.entity_type as string)
    .eq('local_id', jobData.entity_id as string)
    .maybeSingle();

  return NextResponse.json({
    ...jobData,
    erp_docname: syncMap ? (syncMap as Record<string, unknown>).erp_docname : null,
  });
}
