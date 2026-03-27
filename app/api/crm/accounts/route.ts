import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { accountCreateSchema } from '@/lib/validators/crm';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  account_type: z.string().optional(),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, query }) => {
  const { division_id, account_type, search, sort_by, sort_dir } = query as z.infer<
    typeof querySchema
  >;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let dbQuery = supabase
    .from('accounts')
    .select(
      'id, account_name, account_type, division_id, billing_address, shipping_address, notes, industry, phone, email, website, address, company_code, source, total_projects, lifetime_revenue, first_project_date, last_project_date, is_repeat_client, tags, metadata, deleted_at, created_by, created_at, updated_at',
      { count: 'exact' },
    )
    .is('deleted_at', null)
    .order(sort_by ?? 'created_at', { ascending: sort_dir === 'asc' });

  if (division_id) dbQuery = dbQuery.eq('division_id', division_id);
  if (account_type) dbQuery = dbQuery.eq('account_type', account_type);
  if (search) dbQuery = dbQuery.ilike('account_name', `%${search}%`);
  dbQuery = dbQuery.range(offset, offset + limit - 1);

  const { data, error, count } = await dbQuery;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: accountCreateSchema }, async ({ body, userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('accounts')
    .insert({ ...(body as z.infer<typeof accountCreateSchema>) })
    .select()
    .single();

  if (error) throw dbError(error.message);

  return NextResponse.json(data, { status: 201 });
});
