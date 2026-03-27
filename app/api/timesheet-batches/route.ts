import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { timesheetBatchCreateSchema } from '@/lib/validators/time-expense';

export const GET = withApiRoute({}, async ({ req }) => {
  const status = req.nextUrl.searchParams.get('status');
  const divisionId = req.nextUrl.searchParams.get('division_id');
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('timesheet_batches')
    .select(
      'id, division_id, period_start, period_end, status, submitted_by, approved_by, exported_at, adp_export_reference, created_at, updated_at',
      { count: 'exact' },
    )
    .order('period_start', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (divisionId) query = query.eq('division_id', divisionId);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: timesheetBatchCreateSchema },
  async ({ body, userId }) => {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('timesheet_batches')
      .insert({ ...body, submitted_by: userId, status: 'draft' })
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data, { status: 201 });
  },
);
