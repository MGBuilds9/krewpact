import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { data, error, count } = await supabase
    .from('project_daily_logs')
    .select('*, submitted_user:users!project_daily_logs_submitted_by_fkey(first_name, last_name)', {
      count: 'exact',
    })
    .eq('project_id', id)
    .order('log_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});
