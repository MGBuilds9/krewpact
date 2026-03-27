import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { policyOverrideCreateSchema } from '@/lib/validators/org';

const querySchema = z.object({
  user_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ query }) => {
  const {
    user_id,
    limit = 50,
    offset = 0,
  } = query as {
    user_id?: string;
    limit?: number;
    offset?: number;
  };
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  let dbQuery = supabase
    .from('policy_overrides')
    .select(
      'id, user_id, permission_id, override_value, reason, expires_at, created_by, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (user_id) dbQuery = dbQuery.eq('user_id', user_id);

  const { data, error, count } = await dbQuery;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});

export const POST = withApiRoute(
  { bodySchema: policyOverrideCreateSchema },
  async ({ body, userId }) => {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

    const { data, error } = await supabase
      .from('policy_overrides')
      .insert({ ...body, created_by: userId })
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data, { status: 201 });
  },
);
