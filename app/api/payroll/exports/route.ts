import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createPayrollExport } from '@/lib/services/payroll-export';
import { createServiceClient } from '@/lib/supabase/server';
import { payrollExportCreateSchema, payrollExportQuerySchema } from '@/lib/validators/payroll';

const PAYROLL_ROLES = ['platform_admin', 'payroll_admin'];

export const GET = withApiRoute(
  { roles: PAYROLL_ROLES, querySchema: payrollExportQuerySchema },
  async ({ query }) => {
    const supabase = createServiceClient();
    const typedQuery = query as {
      status?: string;
      division_id?: string;
      limit?: number;
      offset?: number;
    };
    const limit = typedQuery.limit ?? 25;
    const offset = typedQuery.offset ?? 0;

    let q = supabase
      .from('payroll_exports')
      .select(
        'id, batch_id, division_id, format, status, file_url, row_count, error_log, period_start, period_end, created_by, created_at, updated_at',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (typedQuery.status) q = q.eq('status', typedQuery.status);
    if (typedQuery.division_id) q = q.eq('division_id', typedQuery.division_id);

    const { data, error, count } = await q;
    if (error) throw dbError(error.message);

    return NextResponse.json(paginatedResponse(data, count, limit, offset));
  },
);

export const POST = withApiRoute(
  { roles: PAYROLL_ROLES, bodySchema: payrollExportCreateSchema },
  async ({ body, userId, logger }) => {
    const supabase = createServiceClient();
    const typedBody = body as {
      period_start: string;
      period_end: string;
      division_ids: string[];
    };

    const result = await createPayrollExport(supabase, {
      periodStart: typedBody.period_start,
      periodEnd: typedBody.period_end,
      divisionIds: typedBody.division_ids,
      createdBy: userId,
    }).catch((err: unknown) => {
      logger.error('POST /api/payroll/exports failed', { err });
      throw dbError('Failed to create payroll export');
    });

    return NextResponse.json({ id: result.exportId, row_count: result.rowCount }, { status: 201 });
  },
);
