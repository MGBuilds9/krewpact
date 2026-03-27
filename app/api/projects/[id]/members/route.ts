import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const addMemberSchema = z.object({
  user_id: z.string().uuid(),
  member_role: z.enum(['manager', 'supervisor', 'worker', 'admin']).default('worker'),
  allocation_pct: z.number().nonnegative().max(100).nullable().optional(),
});

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('project_members')
    .select('*, user:users(id, first_name, last_name, email, avatar_url)', { count: 'exact' })
    .eq('project_id', id)
    .is('left_at', null)
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: addMemberSchema }, async ({ params, body }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('project_members')
    .insert({ project_id: id, ...body })
    .select('*, user:users(id, first_name, last_name, email, avatar_url)')
    .single();

  if (error) throw dbError(error.message);

  return NextResponse.json(data, { status: 201 });
});

export const DELETE = withApiRoute({}, async ({ req, params }) => {
  const memberId = req.nextUrl.searchParams.get('member_id');
  if (!memberId) {
    return NextResponse.json({ error: 'member_id required' }, { status: 400 });
  }

  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase
    .from('project_members')
    .update({ left_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('project_id', id);

  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});
