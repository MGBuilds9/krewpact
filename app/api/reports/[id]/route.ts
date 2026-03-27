import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const updateSchema = z.object({
  log_date: z.string().optional(),
  work_summary: z.string().max(5000).optional(),
  crew_count: z.number().int().nonnegative().nullable().optional(),
  weather: z.record(z.string(), z.any()).nullable().optional(),
  delays: z.string().max(2000).nullable().optional(),
  safety_notes: z.string().max(2000).nullable().optional(),
});

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('project_daily_logs')
    .select(
      '*, submitted_user:users!project_daily_logs_submitted_by_fkey(first_name, last_name, avatar_url), project:projects(project_name)',
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Report not found');
    throw dbError(error.message);
  }
  return NextResponse.json(data);
});

export const PATCH = withApiRoute({ bodySchema: updateSchema }, async ({ params, body }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('project_daily_logs')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Report not found');
    throw dbError(error.message);
  }
  return NextResponse.json(data);
});

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('project_daily_logs').delete().eq('id', id);
  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});
