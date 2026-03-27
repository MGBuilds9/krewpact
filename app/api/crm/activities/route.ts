import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { activityCreateSchema } from '@/lib/validators/crm';

const activityTypes = ['call', 'email', 'meeting', 'note', 'task'] as const;

const querySchema = z.object({
  opportunity_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  activity_type: z.enum(activityTypes).optional(),
  sort_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, query }) => {
  const { opportunity_id, lead_id, account_id, contact_id, activity_type, sort_by, sort_dir } =
    query as z.infer<typeof querySchema>;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let dbQuery = supabase
    .from('activities')
    .select(
      'id, activity_type, title, details, due_at, completed_at, lead_id, contact_id, account_id, opportunity_id, owner_user_id, created_at, updated_at',
      { count: 'exact' },
    )
    .order(sort_by ?? 'created_at', { ascending: sort_dir === 'asc' });

  if (opportunity_id) dbQuery = dbQuery.eq('opportunity_id', opportunity_id);
  if (lead_id) dbQuery = dbQuery.eq('lead_id', lead_id);
  if (account_id) dbQuery = dbQuery.eq('account_id', account_id);
  if (contact_id) dbQuery = dbQuery.eq('contact_id', contact_id);
  if (activity_type) dbQuery = dbQuery.eq('activity_type', activity_type);

  dbQuery = dbQuery.range(offset, offset + limit - 1);

  const { data, error, count } = await dbQuery;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: activityCreateSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('activities')
    .insert(body as z.infer<typeof activityCreateSchema>)
    .select()
    .single();
  if (error) throw dbError(error.message);

  return NextResponse.json(data, { status: 201 });
});
