import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const ADMIN_ROLES = ['platform_admin'];

const querySchema = z.object({
  status: z.string().optional(),
  event_type: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, userId }) => {
  const roles = await getKrewpactRoles();
  if (!roles.some((r: string) => ADMIN_ROLES.includes(r)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const {
    status,
    event_type,
    limit = 50,
    offset = 0,
  } = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('webhook_events')
    /* excluded from list: payload */
    .select(
      'id, provider, event_id, event_type, received_at, processed_at, processing_status, processing_error',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (event_type) query = query.eq('event_type', event_type);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});
