import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { allowanceReconciliationSchema } from '@/lib/validators/selections';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id: projectId } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error, count } = await supabase
    .from('allowance_reconciliations')
    .select(
      'id, project_id, category_name, allowance_budget, selected_cost, variance, last_reconciled_at, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('project_id', projectId)
    .order('category_name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);
  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: allowanceReconciliationSchema },
  async ({ params, body }) => {
    const { id: projectId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('allowance_reconciliations')
      .insert({ ...body, project_id: projectId })
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data, { status: 201 });
  },
);
