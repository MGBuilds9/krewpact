/**
 * Change Order Workflow Service
 *
 * Implements the multi-step approval chain for change orders:
 * draft → submitted → client_review → approved
 *
 * Approved COs trigger ERPNext Sales Order sync and contract value recalculation.
 */

import { logger } from '@/lib/logger';
import { createScopedServiceClient, createUserClientSafe } from '@/lib/supabase/server';

export interface WorkflowResult {
  success: boolean;
  changeOrder?: Record<string, unknown>;
  error?: string;
  code?: string;
}

export async function submitForApproval(
  coId: string,
  submitterId: string,
): Promise<WorkflowResult> {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return { success: false, error: 'Auth failed', code: 'AUTH_ERROR' };

  const { data: co, error: fetchError } = await supabase
    .from('change_orders')
    .select('id, project_id, status')
    .eq('id', coId)
    .single();

  if (fetchError || !co)
    return { success: false, error: 'Change order not found', code: 'NOT_FOUND' };
  if (co.status !== 'draft') {
    return {
      success: false,
      error: `Cannot submit CO in status: ${co.status}`,
      code: 'INVALID_STATE',
    };
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('change_orders')
    .update({ status: 'submitted', updated_at: now })
    .eq('id', coId)
    .select(
      'id, project_id, status, title, amount_delta, reason, approved_at, approved_by, created_at, updated_at',
    )
    .single();

  if (updateError) {
    logger.error('submitForApproval: update failed', { coId, error: updateError.message });
    return { success: false, error: updateError.message, code: 'DB_ERROR' };
  }

  await supabase.from('audit_logs').insert({
    actor_user_id: submitterId,
    action: 'change_order.submitted',
    entity_type: 'change_orders',
    entity_id: coId,
    new_data: { status: 'submitted' },
    context: { project_id: co.project_id },
  });

  return { success: true, changeOrder: updated as Record<string, unknown> };
}

export async function approveChangeOrder(
  coId: string,
  approverId: string,
  comment?: string,
): Promise<WorkflowResult> {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return { success: false, error: 'Auth failed', code: 'AUTH_ERROR' };

  const { data: co, error: fetchError } = await supabase
    .from('change_orders')
    .select('id, project_id, status, amount_delta')
    .eq('id', coId)
    .single();

  if (fetchError || !co)
    return { success: false, error: 'Change order not found', code: 'NOT_FOUND' };
  if (co.status !== 'submitted' && co.status !== 'client_review') {
    return {
      success: false,
      error: `Cannot approve CO in status: ${co.status}`,
      code: 'INVALID_STATE',
    };
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('change_orders')
    .update({ status: 'approved', approved_at: now, approved_by: approverId, updated_at: now })
    .eq('id', coId)
    .select(
      'id, project_id, status, title, amount_delta, reason, approved_at, approved_by, created_at, updated_at',
    )
    .single();

  if (updateError) {
    logger.error('approveChangeOrder: update failed', { coId, error: updateError.message });
    return { success: false, error: updateError.message, code: 'DB_ERROR' };
  }

  await supabase.from('audit_logs').insert({
    actor_user_id: approverId,
    action: 'change_order.approved',
    entity_type: 'change_orders',
    entity_id: coId,
    new_data: { status: 'approved', approved_at: now, approved_by: approverId },
    context: { project_id: co.project_id, comment: comment ?? null },
  });

  await recalculateContractValue(co.project_id as string);

  return { success: true, changeOrder: updated as Record<string, unknown> };
}

export async function rejectChangeOrder(
  coId: string,
  rejecterId: string,
  reason: string,
): Promise<WorkflowResult> {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return { success: false, error: 'Auth failed', code: 'AUTH_ERROR' };

  const { data: co, error: fetchError } = await supabase
    .from('change_orders')
    .select('id, project_id, status')
    .eq('id', coId)
    .single();

  if (fetchError || !co)
    return { success: false, error: 'Change order not found', code: 'NOT_FOUND' };
  const rejectableStatuses = ['submitted', 'client_review'];
  if (!rejectableStatuses.includes(co.status as string)) {
    return {
      success: false,
      error: `Cannot reject CO in status: ${co.status}`,
      code: 'INVALID_STATE',
    };
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('change_orders')
    .update({ status: 'rejected', reason, updated_at: now })
    .eq('id', coId)
    .select(
      'id, project_id, status, title, amount_delta, reason, approved_at, approved_by, created_at, updated_at',
    )
    .single();

  if (updateError) {
    logger.error('rejectChangeOrder: update failed', { coId, error: updateError.message });
    return { success: false, error: updateError.message, code: 'DB_ERROR' };
  }

  await supabase.from('audit_logs').insert({
    actor_user_id: rejecterId,
    action: 'change_order.rejected',
    entity_type: 'change_orders',
    entity_id: coId,
    new_data: { status: 'rejected', reason },
    context: { project_id: co.project_id },
  });

  return { success: true, changeOrder: updated as Record<string, unknown> };
}

export async function submitToClient(coId: string): Promise<WorkflowResult> {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return { success: false, error: 'Auth failed', code: 'AUTH_ERROR' };

  const { data: co, error: fetchError } = await supabase
    .from('change_orders')
    .select('id, project_id, status')
    .eq('id', coId)
    .single();

  if (fetchError || !co)
    return { success: false, error: 'Change order not found', code: 'NOT_FOUND' };
  if (co.status !== 'submitted') {
    return {
      success: false,
      error: `CO must be in submitted state to send to client`,
      code: 'INVALID_STATE',
    };
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('change_orders')
    .update({ status: 'client_review', updated_at: now })
    .eq('id', coId)
    .select(
      'id, project_id, status, title, amount_delta, reason, approved_at, approved_by, created_at, updated_at',
    )
    .single();

  if (updateError) {
    logger.error('submitToClient: update failed', { coId, error: updateError.message });
    return { success: false, error: updateError.message, code: 'DB_ERROR' };
  }

  await supabase.from('audit_logs').insert({
    action: 'change_order.sent_to_client',
    entity_type: 'change_orders',
    entity_id: coId,
    new_data: { status: 'client_review' },
    context: { project_id: co.project_id },
  });

  return { success: true, changeOrder: updated as Record<string, unknown> };
}

export async function recalculateContractValue(projectId: string): Promise<void> {
  const supabase = createScopedServiceClient('co-workflow:recalculate');

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, baseline_budget')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    logger.error('recalculateContractValue: project not found', { projectId });
    return;
  }

  const { data: approvedCos, error: coError } = await supabase
    .from('change_orders')
    .select('amount_delta')
    .eq('project_id', projectId)
    .eq('status', 'approved');

  if (coError) {
    logger.error('recalculateContractValue: query failed', { projectId, error: coError.message });
    return;
  }

  const totalDelta = (approvedCos ?? []).reduce(
    (sum, co) => sum + ((co.amount_delta as number) ?? 0),
    0,
  );
  const baseline = (project.baseline_budget as number) ?? 0;
  const contractValue = baseline + totalDelta;

  const { error: updateError } = await supabase
    .from('projects')
    .update({ contract_value: contractValue, updated_at: new Date().toISOString() })
    .eq('id', projectId);

  if (updateError) {
    logger.error('recalculateContractValue: update failed', {
      projectId,
      error: updateError.message,
    });
  } else {
    logger.info('recalculateContractValue: updated', { projectId, contractValue });
  }
}
