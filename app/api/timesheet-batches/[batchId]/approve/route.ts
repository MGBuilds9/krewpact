import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { timesheetBatchApprovalSchema } from '@/lib/validators/time-expense';

const APPROVAL_ROLES = [
  'platform_admin',
  'executive',
  'operations_manager',
  'accounting',
  'payroll_admin',
];

export const POST = withApiRoute(
  { bodySchema: timesheetBatchApprovalSchema },
  async ({ params, body, userId }) => {
    const roles = await getKrewpactRoles();
    if (!roles.some((r: string) => APPROVAL_ROLES.includes(r)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { batchId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const bodyData = body as { status: string };
    const { data, error } = await supabase
      .from('timesheet_batches')
      .update({
        status: bodyData.status,
        approved_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId)
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);
