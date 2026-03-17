import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getKrewpactUserId } from '@/lib/api/org';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  filter: z.enum(['overdue', 'today', 'upcoming', 'completed', 'all']).optional(),
  entity_type: z.enum(['lead', 'opportunity', 'account', 'contact']).optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { filter = 'all', entity_type } = parsed.data;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const krewpactUserId = await getKrewpactUserId();
  if (!krewpactUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const now = new Date().toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let query = supabase
    .from('activities')
    .select(
      'id, activity_type, title, details, due_at, completed_at, lead_id, contact_id, account_id, opportunity_id, owner_user_id, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('owner_user_id', krewpactUserId)
    .in('activity_type', ['task', 'call', 'meeting']);

  // Apply filter
  switch (filter) {
    case 'overdue':
      query = query.lt('due_at', now).is('completed_at', null);
      break;
    case 'today':
      query = query
        .gte('due_at', todayStart.toISOString())
        .lte('due_at', todayEnd.toISOString())
        .is('completed_at', null);
      break;
    case 'upcoming':
      query = query.gt('due_at', todayEnd.toISOString()).is('completed_at', null);
      break;
    case 'completed':
      query = query.not('completed_at', 'is', null);
      break;
    case 'all':
    default:
      query = query.is('completed_at', null);
      break;
  }

  // Filter by entity type
  if (entity_type) {
    const entityKey = `${entity_type}_id`;
    query = query.not(entityKey, 'is', null);
  }

  query = query
    .order('due_at', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}
