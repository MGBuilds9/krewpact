import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  unread_only: z.enum(['true', 'false']).optional(),
});

const actionSchema = z.object({ action: z.enum(['mark_all_read']) });

export const GET = withApiRoute({ querySchema }, async ({ req, query }) => {
  const { unread_only } = query as { unread_only?: 'true' | 'false' };
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  let dbQuery = supabase
    .from('notifications')
    .select(
      'id, user_id, portal_account_id, channel, title, message, state, read_at, send_at, sent_at, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (unread_only === 'true') {
    dbQuery = dbQuery.neq('state', 'read');
  }

  const { data, error, count } = await dbQuery;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: actionSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  if (body.action === 'mark_all_read') {
    const { error } = await supabase
      .from('notifications')
      .update({ state: 'read', read_at: new Date().toISOString() })
      .neq('state', 'read');

    if (error) throw dbError(error.message);
  }

  return NextResponse.json({ success: true });
});
