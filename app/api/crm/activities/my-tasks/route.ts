import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, forbidden } from '@/lib/api/errors';
import { getKrewpactUserId } from '@/lib/api/org';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  filter: z.enum(['overdue', 'today', 'upcoming', 'completed', 'all']).optional(),
  entity_type: z.enum(['lead', 'opportunity', 'account', 'contact']).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, query }) => {
  const { filter = 'all', entity_type } = query as z.infer<typeof querySchema>;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const krewpactUserId = await getKrewpactUserId();
  if (!krewpactUserId) throw forbidden('Unauthorized');

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const now = new Date().toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let dbQuery = supabase
    .from('activities')
    .select(
      'id, activity_type, title, details, due_at, completed_at, lead_id, contact_id, account_id, opportunity_id, owner_user_id, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('owner_user_id', krewpactUserId)
    .in('activity_type', ['task', 'call', 'meeting']);

  switch (filter) {
    case 'overdue':
      dbQuery = dbQuery.lt('due_at', now).is('completed_at', null);
      break;
    case 'today':
      dbQuery = dbQuery
        .gte('due_at', todayStart.toISOString())
        .lte('due_at', todayEnd.toISOString())
        .is('completed_at', null);
      break;
    case 'upcoming':
      dbQuery = dbQuery.gt('due_at', todayEnd.toISOString()).is('completed_at', null);
      break;
    case 'completed':
      dbQuery = dbQuery.not('completed_at', 'is', null);
      break;
    case 'all':
    default:
      dbQuery = dbQuery.is('completed_at', null);
      break;
  }

  if (entity_type) {
    const entityKey = `${entity_type}_id`;
    dbQuery = dbQuery.not(entityKey, 'is', null);
  }

  dbQuery = dbQuery
    .order('due_at', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await dbQuery;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});
