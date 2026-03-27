import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

async function resolveCallerUser(
  supabase: SupabaseClient,
): Promise<Record<string, unknown> | NextResponse> {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { data, error } = await supabase.rpc('ensure_clerk_user', {
    p_clerk_id: clerkUser.id,
    p_email: clerkUser.primaryEmailAddress?.emailAddress || '',
    p_first_name: clerkUser.firstName || '',
    p_last_name: clerkUser.lastName || '',
    p_avatar_url: clerkUser.imageUrl || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const callerUser = Array.isArray(data) ? data[0] : data;
  if (!callerUser) return NextResponse.json({ error: 'User record not created' }, { status: 500 });

  return callerUser as Record<string, unknown>;
}

async function handleImpersonation(
  supabase: SupabaseClient,
  callerUser: Record<string, unknown>,
  impersonateId: string,
): Promise<NextResponse> {
  const { data: perms } = await supabase.rpc('get_user_permissions', { p_user_id: callerUser.id });
  const permNames = (perms || []).map((p: { permission_name: string }) => p.permission_name);
  const isAdmin = permNames.includes('system.admin') || callerUser.role === 'admin';

  if (!isAdmin) {
    return NextResponse.json({ error: 'Impersonation requires admin privileges' }, { status: 403 });
  }

  const { data: impersonated, error: impErr } = await supabase
    .from('users')
    .select(
      'id, clerk_user_id, first_name, last_name, email, phone, avatar_url, locale, timezone, status, created_at, updated_at',
    )
    .eq('id', impersonateId)
    .single();

  if (impErr || !impersonated) {
    return NextResponse.json({ error: 'Impersonated user not found' }, { status: 404 });
  }

  logger.info('Admin impersonation active', {
    adminId: callerUser.id,
    impersonatedId: impersonateId,
  });
  return NextResponse.json({ ...impersonated, _impersonated_by: callerUser.id });
}

export const GET = withApiRoute({}, async ({ req }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const callerResult = await resolveCallerUser(supabase);
  if (callerResult instanceof NextResponse) return callerResult;
  const callerUser = callerResult;

  const impersonateId = req.nextUrl.searchParams.get('impersonate');
  if (impersonateId) {
    return handleImpersonation(supabase, callerUser, impersonateId);
  }

  return NextResponse.json(callerUser);
});
