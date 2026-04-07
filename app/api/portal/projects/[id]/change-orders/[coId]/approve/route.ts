import { NextResponse } from 'next/server';

import { ApiError, dbError, forbidden, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

/**
 * POST /api/portal/projects/[id]/change-orders/[coId]/approve
 * Approves a pending change order. Only client_owner may approve.
 * Guard: CO must be in 'pending_client_approval' state.
 */
export const POST = withApiRoute(
  { rateLimit: { limit: 20, window: '1 m' } },
  async ({ userId, params }) => {
    const { id: projectId, coId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    // 1. Resolve portal account
    const { data: pa, error: paError } = await supabase
      .from('portal_accounts')
      .select('id, status')
      .eq('clerk_user_id', userId)
      .single();

    if (paError || !pa || pa.status !== 'active') {
      throw forbidden('Access denied');
    }

    // 2. Check permission: must have approve_change_orders = true
    const { data: perm } = await supabase
      .from('portal_permissions')
      .select('permission_set')
      .eq('portal_account_id', pa.id)
      .eq('project_id', projectId)
      .single();

    const permSet: Record<string, boolean> =
      (perm?.permission_set as Record<string, boolean>) ?? {};
    if (!permSet.approve_change_orders) {
      throw forbidden('Insufficient permissions to approve change orders');
    }

    // 3. Fetch CO and verify state
    const { data: co, error: coError } = await supabase
      .from('change_orders')
      .select('id, status, project_id')
      .eq('id', coId)
      .eq('project_id', projectId)
      .single();

    if (coError || !co) throw notFound('Change order');
    if (co.status !== 'pending_client_approval') {
      throw new ApiError('INVALID_STATE', `Cannot approve CO in status: ${co.status}`, 400);
    }

    // 4. Approve: update status and write audit log
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('change_orders')
      .update({ status: 'approved', approved_at: now, updated_at: now })
      .eq('id', coId)
      .select()
      .single();

    if (updateError) throw dbError(updateError.message);

    // 5. Audit log
    await supabase.from('audit_logs').insert({
      actor_portal_id: pa.id,
      action: 'change_order.approved',
      entity_type: 'change_orders',
      entity_id: coId,
      new_data: { status: 'approved', approved_at: now },
      context: { project_id: projectId },
    });

    return NextResponse.json(updated);
  },
);
