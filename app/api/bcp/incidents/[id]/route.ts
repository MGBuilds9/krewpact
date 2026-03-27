import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { bcpIncidentUpdateSchema } from '@/lib/validators/migration';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('bcp_incidents')
    .select(
      'id, incident_number, severity, status, title, summary, started_at, resolved_at, owner_user_id, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: bcpIncidentUpdateSchema },
  async ({ params, body }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('bcp_incidents')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(
        'id, incident_number, severity, status, title, summary, started_at, resolved_at, owner_user_id, created_at, updated_at',
      )
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);
