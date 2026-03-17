import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import type { EstimateStatus } from '@/lib/estimating/estimate-status';
import { validateStatusTransition } from '@/lib/estimating/estimate-status';
import { logger } from '@/lib/logger';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import { createUserClientSafe } from '@/lib/supabase/server';
import { estimateUpdateSchema } from '@/lib/validators/estimating';

type RouteContext = { params: Promise<{ id: string }> };
type SupabaseClient = Awaited<ReturnType<typeof createUserClientSafe>>['client'];

function fireApprovalNotification(record: Record<string, unknown>, id: string): void {
  dispatchNotification({
    type: 'estimate_approved',
    owner_email: (record.owner_email as string) || '',
    owner_name: (record.owner_name as string) || 'Team Member',
    estimate_number: (record.estimate_number as string) || id,
    estimate_id: id,
    opportunity_name: (record.opportunity_name as string) || 'Opportunity',
    approved_by_name: 'A team member',
  }).catch((err) => logger.error('Estimate approval notification failed', { error: err }));
}

async function validateEstimateStatus(
  supabase: SupabaseClient,
  id: string,
  newStatus: string,
): Promise<NextResponse | null> {
  const { data: current, error: fetchError } = await supabase
    .from('estimates')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError) {
    const status = fetchError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: fetchError.message }, { status });
  }

  const currentStatus = (current as Record<string, unknown>).status as EstimateStatus;
  const result = validateStatusTransition(currentStatus, newStatus as EstimateStatus);
  if (!result.valid) return NextResponse.json({ error: result.reason }, { status: 400 });

  return null;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('estimates')
    .select(
      'id, estimate_number, status, subtotal_amount, tax_amount, total_amount, margin_pct, currency_code, revision_no, account_id, contact_id, opportunity_id, division_id, owner_user_id, approved_at, approved_by, metadata, created_at, updated_at, estimate_lines(id, estimate_id, line_type, description, quantity, unit, unit_cost, markup_pct, line_total, sort_order, is_optional, catalog_item_id, assembly_id, parent_line_id, metadata, created_at, updated_at)',
    )
    .eq('id', id)
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const statusField = (body as Record<string, unknown>)?.status as string | undefined;
  const parsed = estimateUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  if (statusField) {
    const validationError = await validateEstimateStatus(supabase, id, statusField);
    if (validationError) return validationError;
  }

  const updateData = { ...parsed.data, ...(statusField ? { status: statusField } : {}) };
  const { data, error } = await supabase
    .from('estimates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  if (statusField === 'approved' && data) {
    fireApprovalNotification(data as Record<string, unknown>, id);
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('estimates').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
