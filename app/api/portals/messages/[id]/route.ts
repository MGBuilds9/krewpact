import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('portal_messages')
    .select(
      'id, project_id, portal_account_id, sender_user_id, direction, subject, body, read_at, created_at, updated_at',
    )
    .eq('id', id)
    .single();
  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});

export const PATCH = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('portal_messages')
    .update({ ...(body as Record<string, unknown>), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});
