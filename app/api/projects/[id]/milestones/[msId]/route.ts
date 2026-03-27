import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { milestoneUpdateSchema } from '@/lib/validators/projects';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id, msId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('milestones')
    .select(
      'id, project_id, milestone_name, milestone_order, planned_date, actual_date, owner_user_id, status, created_at, updated_at',
    )
    .eq('id', msId)
    .eq('project_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Milestone');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: milestoneUpdateSchema },
  async ({ params, body }) => {
    const { id, msId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('milestones')
      .update(body)
      .eq('id', msId)
      .eq('project_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('Milestone');
      throw dbError(error.message);
    }

    return NextResponse.json(data);
  },
);

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id, msId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('milestones').delete().eq('id', msId).eq('project_id', id);

  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});
