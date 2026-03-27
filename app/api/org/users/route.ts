import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { requirePermission } from '@/lib/rbac/permissions';
import { createUserClientSafe } from '@/lib/supabase/server';
import { userProvisioningSchema } from '@/lib/validators/org';

const querySchema = z.object({
  search: z.string().optional(),
  division_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ query }) => {
  const denied = await requirePermission('users.manage');
  if (denied) return denied;

  const {
    search,
    limit = 50,
    offset = 0,
  } = query as {
    search?: string;
    division_id?: string;
    limit?: number;
    offset?: number;
  };
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  let dbQuery = supabase
    .from('users')
    .select(
      'id, clerk_user_id, first_name, last_name, email, phone, avatar_url, locale, timezone, status, created_at, updated_at',
      { count: 'exact' },
    )
    .order('first_name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (search)
    dbQuery = dbQuery.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`,
    );

  const { data, error, count } = await dbQuery;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});

export const POST = withApiRoute(
  { bodySchema: userProvisioningSchema },
  async ({ body, userId }) => {
    const denied = await requirePermission('users.manage');
    if (denied) return denied;

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

    const { data, error } = await supabase
      .from('users')
      .insert({ ...body, is_active: true, provisioned_by: userId })
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data, { status: 201 });
  },
);
