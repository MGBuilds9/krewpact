import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { reconcileExport } from '@/lib/services/payroll-export';
import { createServiceClient } from '@/lib/supabase/server';
import { payrollReconcileSchema } from '@/lib/validators/payroll';

const PAYROLL_ROLES = ['platform_admin', 'payroll_admin'];

// TODO: Remove cast after running `supabase gen types typescript`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getClient = () => createServiceClient() as unknown as SupabaseClient<any>;

export const POST = withApiRoute(
  { roles: PAYROLL_ROLES, bodySchema: payrollReconcileSchema },
  async ({ params, body, logger }) => {
    const supabase = getClient();
    const { id } = params;
    const typedBody = body as { csv_content: string };

    // Fetch the export record
    const { data: exportRecord, error } = await supabase
      .from('payroll_exports')
      .select('id, status')
      .eq('id', id)
      .single();

    if (error || !exportRecord) throw notFound('Payroll export');

    if (exportRecord.status !== 'completed') {
      return NextResponse.json(
        { error: { code: 'INVALID_STATE', message: 'Export must be completed before reconciliation' } },
        { status: 400 },
      );
    }

    // Fetch export rows for comparison
    const { data: rows, error: rowsError } = await supabase
      .from('payroll_export_rows')
      .select('employee_id, hours_regular, hours_overtime, cost_code, pay_rate, department, project_id')
      .eq('export_id', id);

    if (rowsError) throw dbError(rowsError.message);

    const exportRows = (rows ?? []).map((r: Record<string, unknown>) => ({
      employee_id: String(r.employee_id ?? ''),
      employee_name: '',
      hours_regular: Number(r.hours_regular) || 0,
      hours_overtime: Number(r.hours_overtime) || 0,
      cost_code: String(r.cost_code ?? ''),
      pay_rate: Number(r.pay_rate) || 0,
      department: String(r.department ?? ''),
      project_id: r.project_id ? String(r.project_id) : null,
    }));

    const result = reconcileExport(exportRows, typedBody.csv_content);

    // Update export status to reconciled
    await supabase
      .from('payroll_exports')
      .update({ status: 'reconciled' })
      .eq('id', id);

    logger.info('Payroll export reconciled', { exportId: id, result });

    return NextResponse.json(result);
  },
);
