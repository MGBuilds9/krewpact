import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { safetyIncidentUpdateSchema } from '@/lib/validators/safety';

export const PATCH = withApiRoute(
  { bodySchema: safetyIncidentUpdateSchema },
  async ({ params, body }) => {
    const { id, incId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('safety_incidents')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', incId)
      .eq('project_id', id)
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data);
  },
);

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id, incId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase
    .from('safety_incidents')
    .delete()
    .eq('id', incId)
    .eq('project_id', id);

  if (error) throw dbError(error.message);

  return new NextResponse(null, { status: 204 });
});
