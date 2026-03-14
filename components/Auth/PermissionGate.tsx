'use client';

// Client component — conditionally renders children based on the current user's permissions.
// Uses the useRBAC hook which reads role/permission state from client-side context.
// Use this for inline UI elements (buttons, menu items, form fields) in Client Components.

import { useUserRBAC } from '@/hooks/useRBAC';
import type { Permission } from '@/lib/rbac/permissions.shared';

interface PermissionGateProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { hasPermission, isLoading } = useUserRBAC();

  if (isLoading) return null;
  if (!hasPermission(permission)) return <>{fallback}</>;
  return <>{children}</>;
}
