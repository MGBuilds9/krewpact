import { NextResponse } from 'next/server';

import { getKrewpactDivisions, getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import type { KrewpactRole } from '@/lib/rbac/permissions.shared';
import { getPermissions, isExternalRole, isInternalRole } from '@/lib/rbac/permissions.shared';
import { createUserClientSafe } from '@/lib/supabase/server';

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

interface RoleEntry {
  role_name: string;
  is_primary: boolean;
}

async function fetchRbacData(supabase: SupabaseClient, userIdParam: string) {
  return Promise.all([
    supabase.rpc('get_user_role_names', { p_user_id: userIdParam }),
    supabase.rpc('get_user_permissions', { p_user_id: userIdParam }),
    supabase.from('user_divisions').select('division_id').eq('user_id', userIdParam),
    getKrewpactRoles(),
    getKrewpactDivisions(),
  ]);
}

interface MergeParams {
  dbRoles: RoleEntry[];
  dbPermissions: string[];
  dbDivisionIds: string[];
  clerkRoles: string[];
  clerkDivisions: string[];
}

function mergeRolesAndPermissions({
  dbRoles,
  dbPermissions,
  dbDivisionIds,
  clerkRoles,
  clerkDivisions,
}: MergeParams) {
  const validClerkRoles = clerkRoles.filter(
    (r): r is KrewpactRole => isInternalRole(r) || isExternalRole(r),
  );
  const clerkPermissions = getPermissions(validClerkRoles);
  const clerkRoleEntries = validClerkRoles
    .filter((r) => !dbRoles.some((existing) => existing.role_name === r))
    .map((r) => ({ role_name: r, is_primary: dbRoles.length === 0 }));
  return {
    roles: [...dbRoles, ...clerkRoleEntries],
    permissions: Array.from(new Set([...dbPermissions, ...clerkPermissions])),
    divisionIds: Array.from(new Set([...dbDivisionIds, ...clerkDivisions])),
  };
}

export const GET = withApiRoute({}, async ({ req }) => {
  const userIdParam = req.nextUrl.searchParams.get('user_id');
  if (!userIdParam) return NextResponse.json({ error: 'user_id is required' }, { status: 400 });

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const [rolesResult, permissionsResult, divisionsResult, clerkRoles, clerkDivisions] =
    await fetchRbacData(supabase, userIdParam);

  const fetchError = rolesResult.error ?? permissionsResult.error ?? divisionsResult.error;
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const dbRoles = (rolesResult.data ?? []) as RoleEntry[];
  const dbPermissions = (permissionsResult.data ?? []).map(
    (r: { permission_name: string }) => r.permission_name,
  );
  const dbDivisionIds = (divisionsResult.data ?? [])
    .map((d: { division_id: string | null }) => d.division_id)
    .filter(Boolean) as string[];

  const merged = mergeRolesAndPermissions({
    dbRoles,
    dbPermissions,
    dbDivisionIds,
    clerkRoles,
    clerkDivisions,
  });
  return NextResponse.json(merged);
});
