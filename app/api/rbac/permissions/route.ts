import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { getKrewpactRoles, getKrewpactDivisions } from '@/lib/api/org';
import {
  isInternalRole,
  isExternalRole,
  getPermissions,
} from '@/lib/rbac/permissions.shared';
import type { KrewpactRole } from '@/lib/rbac/permissions.shared';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const userIdParam = req.nextUrl.searchParams.get('user_id');
  if (!userIdParam) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  // Fetch Supabase roles/permissions AND Clerk roles in parallel
  const [rolesResult, permissionsResult, divisionsResult, clerkRoles, clerkDivisions] =
    await Promise.all([
      supabase.rpc('get_user_role_names', { p_user_id: userIdParam }),
      supabase.rpc('get_user_permissions', { p_user_id: userIdParam }),
      supabase.from('user_divisions').select('division_id').eq('user_id', userIdParam),
      getKrewpactRoles(),
      getKrewpactDivisions(),
    ]);

  if (rolesResult.error || permissionsResult.error || divisionsResult.error) {
    const errorMsg =
      rolesResult.error?.message ||
      permissionsResult.error?.message ||
      divisionsResult.error?.message ||
      'Unknown error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  const dbRoles = (rolesResult.data || []) as { role_name: string; is_primary: boolean }[];
  const dbPermissions = (permissionsResult.data || []).map(
    (r: { permission_name: string }) => r.permission_name,
  );
  const dbDivisionIds = (divisionsResult.data || [])
    .map((d: { division_id: string | null }) => d.division_id)
    .filter(Boolean) as string[];

  // Merge Clerk-based roles that aren't already in Supabase
  const validClerkRoles = clerkRoles.filter(
    (r): r is KrewpactRole => isInternalRole(r) || isExternalRole(r),
  );
  const clerkPermissions = getPermissions(validClerkRoles);

  const clerkRoleEntries = validClerkRoles
    .filter((r) => !dbRoles.some((existing) => existing.role_name === r))
    .map((r) => ({ role_name: r, is_primary: dbRoles.length === 0 }));

  const roles = [...dbRoles, ...clerkRoleEntries];
  const permissions = Array.from(new Set([...dbPermissions, ...clerkPermissions]));
  const divisionIds = Array.from(new Set([...dbDivisionIds, ...clerkDivisions]));

  return NextResponse.json({ roles, permissions, divisionIds });
}
