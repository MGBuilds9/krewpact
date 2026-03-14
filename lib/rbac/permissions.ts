// Server-only RBAC module.
// Re-exports everything from the shared module and adds requirePermission() for route handlers.
// Do NOT import this file from client components — use permissions.shared.ts instead.

import { NextResponse } from 'next/server';
import { getKrewpactRoles } from '@/lib/api/org';
import { isInternalRole, isExternalRole, hasPermission } from './permissions.shared';
import type { KrewpactRole, Permission } from './permissions.shared';

export * from './permissions.shared';

/**
 * Guard for API route handlers.
 * Returns a 403 NextResponse if the current user lacks the given permission,
 * or null if permission is granted (proceed with the handler).
 *
 * Usage:
 *   const denied = await requirePermission('crm.edit');
 *   if (denied) return denied;
 */
export async function requirePermission(permission: Permission): Promise<NextResponse | null> {
  const roles = await getKrewpactRoles();

  const krewpactRoles = roles.filter(
    (r): r is KrewpactRole => isInternalRole(r) || isExternalRole(r),
  );

  if (krewpactRoles.length === 0) {
    return NextResponse.json({ error: 'No valid roles found' }, { status: 403 });
  }

  if (!hasPermission(krewpactRoles, permission)) {
    return NextResponse.json({ error: `Missing permission: ${permission}` }, { status: 403 });
  }

  return null;
}
