import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { privacyRequestCreateSchema } from '@/lib/validators/migration';

const ADMIN_ROLES = ['platform_admin'];

const querySchema = z.object({
  status: z.string().optional(),
  request_type: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, userId }) => {
  const roles = await getKrewpactRoles();
  if (!roles.some((r: string) => ADMIN_ROLES.includes(r)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const {
    status,
    request_type,
    limit = 50,
    offset = 0,
  } = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('privacy_requests')
    .select(
      'id, requester_email, requester_name, request_type, status, legal_basis, due_at, completed_at, handled_by, notes, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (request_type) query = query.eq('request_type', request_type);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});

export const POST = withApiRoute(
  { bodySchema: privacyRequestCreateSchema },
  async ({ body, userId }) => {
    const roles = await getKrewpactRoles();
    if (!roles.some((r: string) => ADMIN_ROLES.includes(r)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('privacy_requests')
      .insert({ ...body, status: 'received', received_by: userId })
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data, { status: 201 });
  },
);
