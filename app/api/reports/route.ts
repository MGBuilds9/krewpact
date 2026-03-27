import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  project_id: z.string().uuid().optional(),
  submitted_by: z.string().uuid().optional(),
});

const createSchema = z.object({
  project_id: z.string().uuid(),
  log_date: z.string(),
  work_summary: z.string().max(5000).optional(),
  crew_count: z.number().int().nonnegative().optional(),
  weather: z.record(z.string(), z.any()).optional(),
  delays: z.string().max(2000).optional(),
  safety_notes: z.string().max(2000).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req }) => {
  const { project_id, submitted_by } = querySchema.parse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('project_daily_logs')
    .select(
      '*, submitted_user:users!project_daily_logs_submitted_by_fkey(first_name, last_name, avatar_url), project:projects(project_name)',
      { count: 'exact' },
    )
    .order('log_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (project_id) query = query.eq('project_id', project_id);
  if (submitted_by) query = query.eq('submitted_by', submitted_by);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: createSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase.from('project_daily_logs').insert(body).select().single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});
