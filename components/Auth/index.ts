// Barrel export for Auth components.
//
// NOTE: Do NOT import this barrel from 'use client' components.
// Client components should import directly from './PermissionGate' to avoid
// pulling the server-only RoleGuard into the client bundle.

export { RoleGuard } from './RoleGuard';
export { PermissionGate } from './PermissionGate';
