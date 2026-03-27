import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { costCodeMappingSchema } from '@/lib/validators/procurement';

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const GET = withApiRoute({ querySchema }, async ({ req, params }) => {
  const { id } = params;
  const qp = Object.fromEntries(req.nextUrl.searchParams);
  const { limit, offset } = querySchema.parse(qp);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: costCode } = await supabase
    .from('cost_code_dictionary')
    .select('cost_code, division_id')
    .eq('id', id)
    .single();

  if (!costCode) throw notFound('Cost code');

  const { data, error, count } = await supabase
    .from('cost_code_mappings')
    .select(
      'id, division_id, local_cost_code, erp_cost_code, adp_labor_code, is_active, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('local_cost_code', costCode.cost_code)
    .eq('division_id', costCode.division_id)
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);
  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});

export const POST = withApiRoute({ bodySchema: costCodeMappingSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('cost_code_mappings')
    .insert({ ...body, is_active: true })
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});
