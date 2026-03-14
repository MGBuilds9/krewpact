import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { getKrewpactRoles } from '@/lib/api/org';

const ALLOWED_ROLES = ['platform_admin', 'executive'];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roles = await getKrewpactRoles();
  if (!roles.some((r) => ALLOWED_ROLES.includes(r))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  // Get counts by entity_type and status
  const { data: jobs, error: jobsError } = await supabase
    .from('erp_sync_jobs')
    .select('entity_type, status, completed_at')
    .order('completed_at', { ascending: false });

  if (jobsError) {
    return NextResponse.json({ error: jobsError.message }, { status: 500 });
  }

  // Aggregate stats per entity type
  const entityTypes = [
    'account',
    'estimate',
    'opportunity',
    'sales_order',
    'contact',
    'project',
    'task',
    'supplier',
    'expense_claim',
    'timesheet',
    'sales_invoice',
    'purchase_invoice',
    'payment_entry',
  ];

  const stats = entityTypes.map((type) => {
    const typeJobs = (jobs || []).filter((j: Record<string, unknown>) => j.entity_type === type);
    const succeeded = typeJobs.filter(
      (j: Record<string, unknown>) => j.status === 'succeeded',
    ).length;
    const failed = typeJobs.filter((j: Record<string, unknown>) => j.status === 'failed').length;
    const queued = typeJobs.filter((j: Record<string, unknown>) => j.status === 'queued').length;
    const lastSync = typeJobs.find((j: Record<string, unknown>) => j.status === 'succeeded');
    return {
      entity_type: type,
      total: typeJobs.length,
      succeeded,
      failed,
      queued,
      last_sync_at: lastSync ? (lastSync as Record<string, unknown>).completed_at : null,
    };
  });

  // Recent errors
  const { data: recentErrors } = await supabase
    .from('erp_sync_errors')
    .select('id, job_id, error_message, error_code, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    stats,
    recent_errors: recentErrors || [],
    total_jobs: (jobs || []).length,
  });
}
