'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from './useCurrentUser';
import { apiFetch } from '@/lib/api-client';

export interface UserRBACData {
  roles: { role_name: string; is_primary: boolean }[];
  permissions: string[];
  primaryRole: string | null;
  divisionIds: string[];
}

export function canAccessServiceWithRBAC(
  rbac: UserRBACData,
  service: {
    access_level: string;
    required_permissions?: string[] | null;
    required_roles?: string[] | null;
    restricted_to_divisions?: string[] | null;
  },
): boolean {
  if (service.access_level === 'company_wide') return true;

  if (service.access_level === 'permission_based' && service.required_permissions?.length) {
    return service.required_permissions.some((p) => rbac.permissions.includes(p));
  }

  if (service.access_level === 'role_based' && service.required_roles?.length) {
    const userRoleNames = rbac.roles.map((r) => r.role_name);
    return service.required_roles.some((r) => userRoleNames.includes(r));
  }

  if (service.access_level === 'division_based' && service.restricted_to_divisions?.length) {
    return service.restricted_to_divisions.some((d) => rbac.divisionIds.includes(d));
  }

  if (service.access_level === 'admin_only') {
    return rbac.permissions.includes('admin.system');
  }
  if (service.access_level === 'finance') {
    return rbac.permissions.includes('finance.view');
  }
  if (service.access_level === 'manager') {
    return rbac.permissions.includes('admin.view');
  }

  return false;
}

const EMPTY_ROLES: { role_name: string; is_primary: boolean }[] = [];
const EMPTY_PERMISSIONS: string[] = [];
const EMPTY_DIVISIONS: string[] = [];

export function useUserRBAC() {
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id;

  const { data: rbacResponse, isLoading } = useQuery({
    queryKey: ['rbac-permissions', userId],
    queryFn: () =>
      apiFetch<{
        roles: { role_name: string; is_primary: boolean }[];
        permissions: string[];
        divisionIds: string[];
      }>('/api/rbac/permissions', { params: { user_id: userId } }),
    enabled: !!userId,
  });

  const rbacData = useMemo(() => {
    const roleByLegacy: Record<string, string[]> = {
      admin: ['platform_admin'],
      manager: ['operations_manager'],
      worker: [],
    };
    const permissionsByLegacy: Record<string, string[]> = {
      admin: ['admin.system', 'users.manage'],
      manager: ['projects.view'],
      worker: [],
    };

    const legacyRole = currentUser?.role;
    const legacyRoleNames = legacyRole ? roleByLegacy[legacyRole] || [] : [];
    const legacyPermissions = legacyRole ? permissionsByLegacy[legacyRole] || [] : [];

    const roles = rbacResponse?.roles || EMPTY_ROLES;
    const effectiveRoles = legacyRoleNames
      .filter((roleName) => !roles.some((r) => r.role_name === roleName))
      .map((roleName) => ({ role_name: roleName, is_primary: roles.length === 0 }))
      .concat(roles);

    const permissions = rbacResponse?.permissions || EMPTY_PERMISSIONS;
    const effectivePermissions = Array.from(new Set([...permissions, ...legacyPermissions]));
    const divisionIds = rbacResponse?.divisionIds || EMPTY_DIVISIONS;
    const primaryRole = effectiveRoles.find((r) => r.is_primary)?.role_name || null;

    return { roles: effectiveRoles, permissions: effectivePermissions, primaryRole, divisionIds };
  }, [currentUser?.role, rbacResponse]);

  return useMemo(
    () => ({
      ...rbacData,
      isLoading,
      hasPermission: (permission: string) => rbacData.permissions.includes(permission),
      hasRole: (roleName: string) => rbacData.roles.some((r) => r.role_name === roleName),
      isAdmin: rbacData.permissions.includes('admin.system'),
    }),
    [rbacData, isLoading],
  );
}
