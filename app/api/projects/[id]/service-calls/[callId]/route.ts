import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { serviceCallUpdateSchema } from '@/lib/validators/closeout';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id: projectId, callId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('service_calls')
    .select(
      'id, project_id, warranty_item_id, call_number, title, description, priority, status, requested_by_portal_id, assigned_to, opened_at, resolved_at, closed_at, created_at, updated_at',
    )
    .eq('id', callId)
    .eq('project_id', projectId)
    .single();

  if (error) throw notFound('Service call');
  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: serviceCallUpdateSchema },
  async ({ params, body }) => {
    const { id: projectId, callId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('service_calls')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', callId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);
