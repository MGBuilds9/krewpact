import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, forbidden } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { referenceDataSetSchema } from '@/lib/validators/governance';

const ADMIN_ROLES = ['platform_admin'];

const querySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, userId: _userId }) => {
  const roles = await getKrewpactRoles();
  if (!roles.some((r: string) => ADMIN_ROLES.includes(r))) throw forbidden();

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const { status, limit = 50, offset = 0 } = querySchema.parse(params);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('reference_data_sets')
    .select('id, set_key, set_name, status, created_at, updated_at', { count: 'exact' })
    .order('set_name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});

export const POST = withApiRoute(
  { bodySchema: referenceDataSetSchema },
  async ({ body, userId }) => {
    const roles = await getKrewpactRoles();
    if (!roles.some((r: string) => ADMIN_ROLES.includes(r))) throw forbidden();

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const bodyData = body as { status?: string } & Record<string, unknown>;
    const { data, error } = await supabase
      .from('reference_data_sets')
      .insert({ ...bodyData, status: bodyData.status ?? 'draft', created_by: userId })
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data, { status: 201 });
  },
);
