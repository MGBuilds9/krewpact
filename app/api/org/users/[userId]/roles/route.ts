import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, forbidden, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { requirePermission } from '@/lib/rbac/permissions';
import { syncRolesToBothStores } from '@/lib/rbac/sync-roles';
import { createServiceClient, createUserClientSafe } from '@/lib/supabase/server';

const putBodySchema = z.object({
  role_keys: z.array(z.string().min(1)).min(1),
  division_ids: z.array(z.string()).optional(),
});

export const GET = withApiRoute({}, async ({ params }) => {
  const denied = await requirePermission('users.manage');
  if (denied) return denied;

  const targetUserId = params['userId'];
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const [rolesResult, divisionsResult] = await Promise.all([
    supabase
      .from('user_roles')
      .select('is_primary, roles(role_key, role_name)')
      .eq('user_id', targetUserId),
    supabase.from('user_divisions').select('division_id').eq('user_id', targetUserId),
  ]);

  if (rolesResult.error) throw dbError(rolesResult.error.message);
  if (divisionsResult.error) throw dbError(divisionsResult.error.message);

  const roles = (rolesResult.data ?? []).map((r) => {
    const roleData = r.roles as unknown as { role_key: string; role_name: string } | null;
    return {
      role_key: roleData?.role_key ?? '',
      role_name: roleData?.role_name ?? '',
      is_primary: r.is_primary,
    };
  });

  const divisions = (divisionsResult.data ?? []).map((d) => ({ division_id: d.division_id }));

  return NextResponse.json({ roles, divisions });
});

export const PUT = withApiRoute({ bodySchema: putBodySchema }, async ({ params, body, userId }) => {
  const denied = await requirePermission('users.manage');
  if (denied) return denied;

  const targetUserId = params['userId'];
  const db = createServiceClient();

  const { data: targetUser, error: userError } = await db
    .from('users')
    .select('id, clerk_user_id')
    .eq('id', targetUserId)
    .single();

  if (userError || !targetUser) throw notFound('User');
  if (!targetUser.clerk_user_id) throw forbidden('User has no linked Clerk account');

  const result = await syncRolesToBothStores({
    supabaseUserId: targetUserId,
    clerkUserId: targetUser.clerk_user_id,
    roleKeys: body.role_keys,
    divisionIds: body.division_ids,
    assignedBy: userId,
  });

  if (!result.success) {
    return NextResponse.json({ error: 'Role sync failed', details: result.errors }, { status: 500 });
  }

  return NextResponse.json({ success: true, errors: result.errors });
});
