import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { requireRole } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  role_type: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, query }) => {
  const authResult = await requireRole(['platform_admin']);
  if (authResult instanceof NextResponse) return authResult;

  const {
    role_type,
    limit = 50,
    offset = 0,
  } = query as {
    role_type?: string;
    limit?: number;
    offset?: number;
  };
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  let dbQuery = supabase
    .from('roles')
    .select('id, role_key, role_name, scope, is_system, created_at, updated_at', {
      count: 'exact',
    })
    .eq('is_active', true)
    .order('role_name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (role_type) dbQuery = dbQuery.eq('role_type', role_type);

  const { data, error, count } = await dbQuery;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});
