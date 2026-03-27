import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const updateSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().nullable().optional(),
  notification_preferences: z.record(z.string(), z.boolean()).optional(),
});

export const GET = withApiRoute({}, async ({ userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data, error } = await supabase
    .from('users')
    .select(
      'id, email, first_name, last_name, avatar_url, clerk_user_id, phone, locale, timezone, status, created_at, updated_at',
    )
    .eq('clerk_user_id', userId)
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});

export const PATCH = withApiRoute({ bodySchema: updateSchema }, async ({ body, userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data, error } = await supabase
    .from('users')
    .update(body)
    .eq('clerk_user_id', userId)
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});
