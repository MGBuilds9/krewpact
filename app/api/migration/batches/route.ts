import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { migrationBatchCreateSchema } from '@/lib/validators/migration';

const ADMIN_ROLES = ['platform_admin'];

const querySchema = z.object({
  status: z.string().optional(),
  source_system: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, userId: _userId }) => {
  const roles = await getKrewpactRoles();
  if (!roles.some((r: string) => ADMIN_ROLES.includes(r)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const {
    status,
    source_system,
    limit = 50,
    offset = 0,
  } = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('migration_batches')
    .select(
      'id, source_system, batch_name, status, started_at, completed_at, created_by, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (source_system) query = query.eq('source_system', source_system);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});

export const POST = withApiRoute(
  { bodySchema: migrationBatchCreateSchema },
  async ({ body, userId }) => {
    const roles = await getKrewpactRoles();
    if (!roles.some((r: string) => ADMIN_ROLES.includes(r)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('migration_batches')
      .insert({ ...body, status: 'queued', created_by: userId })
      .select(
        'id, source_system, batch_name, status, started_at, completed_at, summary, created_by, created_at, updated_at',
      )
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data, { status: 201 });
  },
);
