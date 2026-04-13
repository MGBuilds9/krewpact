import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { queue } from '@/lib/queue/client';
import { JobType } from '@/lib/queue/types';
import { createUserClientSafe } from '@/lib/supabase/server';
import { contactCreateSchema } from '@/lib/validators/crm';

const querySchema = z.object({
  account_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),
});

const CONTACT_SELECT =
  'id, first_name, last_name, full_name, email, phone, mobile, title, role, linkedin_url, is_primary, is_decision_maker, lead_id, preferred_channel, email_opted_in, phone_opted_in, last_contacted_at, total_touches, created_at, updated_at';

export const GET = withApiRoute({ querySchema }, async ({ req, query }) => {
  const { account_id, lead_id, search, sort_by, sort_dir } = query as z.infer<typeof querySchema>;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let dbQuery = supabase
    .from('contacts')
    .select(CONTACT_SELECT, { count: 'exact' })
    .order(sort_by ?? 'created_at', { ascending: sort_dir === 'asc' });

  if (account_id) dbQuery = dbQuery.eq('account_id', account_id);
  if (lead_id) dbQuery = dbQuery.eq('lead_id', lead_id);
  if (search) dbQuery = dbQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  dbQuery = dbQuery.range(offset, offset + limit - 1);

  const { data, error, count } = await dbQuery;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: contactCreateSchema }, async ({ body, userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('contacts')
    .insert({ ...(body as z.infer<typeof contactCreateSchema>) })
    .select()
    .single();

  if (error) throw dbError(error.message);

  queue.enqueue(JobType.ERPSyncContact, { entityId: data.id, userId }).catch((err) => {
    logger.error('Failed to enqueue ERPNext contact sync', {
      contactId: data.id,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return NextResponse.json(data, { status: 201 });
});
