import { auth, currentUser } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  // Ensure the calling user exists in our DB
  const { data, error } = await supabase.rpc('ensure_clerk_user', {
    p_clerk_id: clerkUser.id,
    p_email: clerkUser.primaryEmailAddress?.emailAddress || '',
    p_first_name: clerkUser.firstName || '',
    p_last_name: clerkUser.lastName || '',
    p_avatar_url: clerkUser.imageUrl || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const callerUser = Array.isArray(data) ? data[0] : data;
  if (!callerUser) {
    return NextResponse.json({ error: 'User record not created' }, { status: 500 });
  }

  // Handle impersonation: ?impersonate=<userId>
  const impersonateId = req.nextUrl.searchParams.get('impersonate');
  if (impersonateId) {
    // Verify caller has system.admin permission
    const { data: perms } = await supabase.rpc('get_user_permissions', {
      p_user_id: callerUser.id,
    });
    const permNames = (perms || []).map((p: { permission_name: string }) => p.permission_name);
    const isAdmin = permNames.includes('system.admin') || callerUser.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Impersonation requires admin privileges' },
        { status: 403 },
      );
    }

    // Fetch the impersonated user
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

  return NextResponse.json(callerUser);
}
