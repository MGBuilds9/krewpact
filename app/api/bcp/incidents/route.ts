import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { bcpIncidentCreateSchema } from '@/lib/validators/migration';

const BCP_ROLES = ['platform_admin', 'executive'];

const querySchema = z.object({
  status: z.string().optional(),
  severity: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, userId: _userId }) => {
  // Role check — BCP is restricted
  const { getKrewpactRoles } = await import('@/lib/api/org');
  const roles = await getKrewpactRoles();
  if (!roles.some((r: string) => BCP_ROLES.includes(r))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const { status, severity, limit = 50, offset = 0 } = querySchema.parse(params);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('bcp_incidents')
    .select(
      'id, incident_number, severity, status, title, summary, started_at, resolved_at, owner_user_id, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (severity) query = query.eq('severity', severity);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});

export const POST = withApiRoute(
  { bodySchema: bcpIncidentCreateSchema },
  async ({ userId, body }) => {
    const { getKrewpactRoles } = await import('@/lib/api/org');
    const roles = await getKrewpactRoles();
    if (!roles.some((r: string) => BCP_ROLES.includes(r))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('bcp_incidents')
      .insert({ ...body, status: 'open', declared_by: userId })
      .select(
        'id, incident_number, severity, status, title, summary, started_at, resolved_at, owner_user_id, created_at, updated_at',
      )
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data, { status: 201 });
  },
);
