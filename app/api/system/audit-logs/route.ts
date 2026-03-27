import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { auditLogQuerySchema } from '@/lib/validators/system';

const ADMIN_ROLES = ['platform_admin'];

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;
type AuditQueryParams = {
  entity_type?: string;
  entity_id?: string;
  actor_user_id?: string;
  action?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
};

function buildAuditQuery(supabase: SupabaseClient, params: AuditQueryParams) {
  const {
    entity_type,
    entity_id,
    actor_user_id,
    action,
    from_date,
    to_date,
    limit = 50,
    offset = 0,
  } = params;

  let query = supabase
    .from('audit_logs')
    .select(
      'id, entity_type, entity_id, action, actor_user_id, actor_portal_id, ip_address, user_agent, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (entity_type) query = query.eq('entity_type', entity_type);
  if (entity_id) query = query.eq('entity_id', entity_id);
  if (actor_user_id) query = query.eq('actor_user_id', actor_user_id);
  if (action) query = query.eq('action', action);
  if (from_date) query = query.gte('created_at', from_date);
  if (to_date) query = query.lte('created_at', to_date);

  return { query, limit, offset };
}

export const GET = withApiRoute({ querySchema: auditLogQuerySchema }, async ({ req, userId }) => {
  const roles = await getKrewpactRoles();
  if (!roles.some((r: string) => ADMIN_ROLES.includes(r)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = auditLogQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { query, limit, offset } = buildAuditQuery(supabase, parsed);
  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});
