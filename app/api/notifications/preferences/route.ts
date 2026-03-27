import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { notificationPreferenceUpdateSchema } from '@/lib/validators/org';

export const GET = withApiRoute({}, async ({ userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data, error } = await supabase
    .from('notification_preferences')
    .select(
      'id, user_id, in_app_enabled, email_enabled, push_enabled, quiet_hours, created_at, updated_at',
    )
    .eq('clerk_user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw dbError(error.message);

  return NextResponse.json(
    data ?? {
      in_app_enabled: true,
      email_enabled: true,
      push_enabled: false,
      quiet_hours: null,
    },
  );
});

export const PATCH = withApiRoute(
  { bodySchema: notificationPreferenceUpdateSchema },
  async ({ body, userId }) => {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        { ...body, clerk_user_id: userId, updated_at: new Date().toISOString() },
        { onConflict: 'clerk_user_id' },
      )
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);
