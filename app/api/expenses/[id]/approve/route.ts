import { NextResponse } from 'next/server';

import { dbError, forbidden } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { expenseApprovalSchema } from '@/lib/validators/time-expense';

const APPROVAL_ROLES = ['platform_admin', 'executive', 'operations_manager', 'accounting'];

export const POST = withApiRoute(
  { bodySchema: expenseApprovalSchema },
  async ({ params, body, userId }) => {
    const { getKrewpactRoles } = await import('@/lib/api/org');
    const roles = await getKrewpactRoles();
    if (!roles.some((r: string) => APPROVAL_ROLES.includes(r))) {
      throw forbidden('Approval role required');
    }

    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const approvalBody = body as { decision: string; reviewer_notes?: string };
    const { data, error } = await supabase
      .from('expense_approvals')
      .insert({
        expense_id: id,
        decision: approvalBody.decision,
        reviewer_user_id: userId,
        reviewer_notes: approvalBody.reviewer_notes ?? null,
      })
      .select()
      .single();

    if (error) throw dbError(error.message);

    await supabase
      .from('expense_claims')
      .update({ status: approvalBody.decision, updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json(data, { status: 201 });
  },
);
