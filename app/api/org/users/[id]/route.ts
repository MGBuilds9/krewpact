import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { requirePermission } from '@/lib/rbac/permissions';
import { createUserClientSafe } from '@/lib/supabase/server';

const userPatchSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).optional().nullable(),
  avatar_url: z.string().url().max(2048).optional().nullable(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export const GET = withApiRoute({}, async ({ params }) => {
  const denied = await requirePermission('users.manage');
  if (denied) return denied;

  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data, error } = await supabase
    .from('users')
    .select(
      'id, clerk_user_id, first_name, last_name, email, phone, avatar_url, locale, timezone, status, created_at, updated_at',
    )
    .eq('id', id)
    .single();
  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});

export const PATCH = withApiRoute({ bodySchema: userPatchSchema }, async ({ params, body }) => {
  const denied = await requirePermission('users.manage');
  if (denied) return denied;

  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data, error } = await supabase
    .from('users')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});
