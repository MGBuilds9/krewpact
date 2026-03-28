// Client-safe RBAC types, constants, and pure helpers.
// This file has no server-only imports — safe to use in client components and shared logic.

// ─── Role Types ───────────────────────────────────────────────────────────────

export type InternalRole =
  | 'platform_admin'
  | 'executive'
  | 'operations_manager'
  | 'project_manager'
  | 'project_coordinator'
  | 'estimator'
  | 'field_supervisor'
  | 'accounting'
  | 'payroll_admin';

export type ExternalRole =
  | 'client_owner'
  | 'client_delegate'
  | 'trade_partner_admin'
  | 'trade_partner_user';

export type KrewpactRole = InternalRole | ExternalRole;

// ─── Permission Types ─────────────────────────────────────────────────────────

export type Permission =
  | 'crm.view'
  | 'crm.edit'
  | 'crm.delete'
  | 'crm.admin'
  | 'projects.view'
  | 'projects.edit'
  | 'projects.admin'
  | 'estimates.view'
  | 'estimates.edit'
  | 'estimates.admin'
  | 'finance.view'
  | 'finance.edit'
  | 'finance.admin'
  | 'admin.view'
  | 'admin.edit'
  | 'admin.system'
  | 'reports.view'
  | 'reports.export'
  | 'safety.view'
  | 'safety.edit'
  | 'field_ops.view'
  | 'field_ops.edit'
  | 'portals.manage'
  | 'users.manage'
  | 'roles.manage';

const ALL_PERMISSIONS: Permission[] = [
  'crm.view',
  'crm.edit',
  'crm.delete',
  'crm.admin',
  'projects.view',
  'projects.edit',
  'projects.admin',
  'estimates.view',
  'estimates.edit',
  'estimates.admin',
  'finance.view',
  'finance.edit',
  'finance.admin',
  'admin.view',
  'admin.edit',
  'admin.system',
  'reports.view',
  'reports.export',
  'safety.view',
  'safety.edit',
  'field_ops.view',
  'field_ops.edit',
  'portals.manage',
  'users.manage',
  'roles.manage',
];

// ─── Permission Matrix ────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<KrewpactRole, readonly Permission[]> = {
  platform_admin: ALL_PERMISSIONS,

  executive: [
    'crm.view',
    'projects.view',
    'estimates.view',
    'finance.view',
    'admin.view',
    'reports.view',
    'reports.export',
    'safety.view',
    'field_ops.view',
  ],

  operations_manager: [
    'crm.view',
    'crm.edit',
    'crm.delete',
    'crm.admin',
    'projects.view',
    'projects.edit',
    'projects.admin',
    'estimates.view',
    'admin.view',
    'reports.view',
    'reports.export',
    'safety.view',
    'safety.edit',
    'field_ops.view',
    'field_ops.edit',
  ],

  project_manager: [
    'crm.view',
    'crm.edit',
    'projects.view',
    'projects.edit',
    'estimates.view',
    'reports.view',
    'safety.view',
    'safety.edit',
    'field_ops.view',
    'field_ops.edit',
  ],

  project_coordinator: [
    'crm.view',
    'projects.view',
    'projects.edit',
    'safety.view',
    'field_ops.view',
    'field_ops.edit',
  ],

  estimator: ['crm.view', 'estimates.view', 'estimates.edit', 'estimates.admin'],

  field_supervisor: [
    'projects.view',
    'safety.view',
    'safety.edit',
    'field_ops.view',
    'field_ops.edit',
  ],

  accounting: [
    'crm.view',
    'projects.view',
    'estimates.view',
    'finance.view',
    'finance.edit',
    'finance.admin',
  ],

  payroll_admin: ['finance.view'],

  client_owner: ['projects.view', 'portals.manage'],

  client_delegate: ['projects.view'],

  trade_partner_admin: ['projects.view', 'portals.manage'],

  trade_partner_user: ['projects.view'],
};

// ─── Role Lookup Sets ─────────────────────────────────────────────────────────

const INTERNAL_ROLES = new Set<string>([
  'platform_admin',
  'executive',
  'operations_manager',
  'project_manager',
  'project_coordinator',
  'estimator',
  'field_supervisor',
  'accounting',
  'payroll_admin',
]);

const EXTERNAL_ROLES = new Set<string>([
  'client_owner',
  'client_delegate',
  'trade_partner_admin',
  'trade_partner_user',
]);

// ─── Pure Helper Functions ────────────────────────────────────────────────────

export function isInternalRole(role: string): role is InternalRole {
  return INTERNAL_ROLES.has(role);
}

export function isExternalRole(role: string): role is ExternalRole {
  return EXTERNAL_ROLES.has(role);
}

export function isAdmin(roles: KrewpactRole[]): boolean {
  return roles.includes('platform_admin');
}

export function hasPermission(roles: KrewpactRole[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export function getPermissions(roles: KrewpactRole[]): Permission[] {
  const perms = new Set<Permission>();
  for (const role of roles) {
    for (const p of ROLE_PERMISSIONS[role] ?? []) {
      perms.add(p);
    }
  }
  return Array.from(perms);
}
