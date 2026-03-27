import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { bcpRecoveryEventSchema } from '@/lib/validators/migration';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('bcp_recovery_events')
    .select('id, incident_id, event_type, created_by, created_at')
    .eq('incident_id', id)
    .order('created_at', { ascending: true });

  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});

export const POST = withApiRoute(
  { bodySchema: bcpRecoveryEventSchema },
  async ({ params, body, userId }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('bcp_recovery_events')
      .insert({ ...body, incident_id: id, created_by: userId })
      .select('id, incident_id, event_type, event_payload, created_by, created_at')
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data, { status: 201 });
  },
);
