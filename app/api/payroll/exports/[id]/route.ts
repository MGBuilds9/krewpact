import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createServiceClient } from '@/lib/supabase/server';

const PAYROLL_ROLES = ['platform_admin', 'payroll_admin'];

export const GET = withApiRoute(
  { roles: PAYROLL_ROLES },
  async ({ params }) => {
    const supabase = createServiceClient();
    const { id } = params;

    const { data: exportRecord, error } = await supabase
      .from('payroll_exports')
      .select(
        'id, batch_id, division_id, format, status, file_url, row_count, error_log, period_start, period_end, created_by, created_at, updated_at',
      )
      .eq('id', id)
      .single();

    if (error || !exportRecord) throw notFound('Payroll export');

    // Fetch export rows
    const { data: rows, error: rowsError } = await supabase
      .from('payroll_export_rows')
      .select(
        'id, employee_id, employee_name, hours_regular, hours_overtime, cost_code, pay_rate, department, project_id, status, error_message',
      )
      .eq('export_id', id)
      .order('employee_id');

    if (rowsError) throw dbError(rowsError.message);

    return NextResponse.json({ ...exportRecord, rows: rows ?? [] });
  },
);
