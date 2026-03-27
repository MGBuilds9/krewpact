import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { profileUpdateSchema } from '@/lib/validators/org';

export const GET = withApiRoute({}, async ({ userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data, error } = await supabase
    .from('users')
    .select(
      'id, clerk_user_id, first_name, last_name, email, phone, avatar_url, locale, timezone, status, created_at, updated_at',
    )
    .eq('clerk_user_id', userId)
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});

export const PATCH = withApiRoute({ bodySchema: profileUpdateSchema }, async ({ body, userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data, error } = await supabase
    .from('users')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('clerk_user_id', userId)
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});
