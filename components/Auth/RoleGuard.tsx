// Server component — evaluates permissions on the server and conditionally renders children.
// Use this for page-level or section-level access control in Server Components.

import { getKrewpactRoles } from '@/lib/api/org';
import { hasPermission, isInternalRole, isExternalRole } from '@/lib/rbac/permissions.shared';
import type { KrewpactRole, Permission } from '@/lib/rbac/permissions.shared';

interface RoleGuardProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export async function RoleGuard({ permission, children, fallback }: RoleGuardProps) {
  const roles = await getKrewpactRoles();

  const krewpactRoles = roles.filter(
    (r): r is KrewpactRole => isInternalRole(r) || isExternalRole(r),
  );

  if (!hasPermission(krewpactRoles, permission)) {
    return (
      fallback ?? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p>You don&apos;t have permission to view this page.</p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
