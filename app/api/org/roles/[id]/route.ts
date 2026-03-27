import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data, error } = await supabase
    .from('roles')
    .select('id, role_key, role_name, scope, is_system, created_at, updated_at')
    .eq('id', id)
    .single();
  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});
