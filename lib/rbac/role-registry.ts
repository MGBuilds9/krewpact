// Single source of truth for all KrewPact role definitions with display labels.
// Import from here for UI rendering, Zod enums, and validation.

import type { KrewpactRole } from './permissions.shared';

export interface RoleDefinition {
  key: KrewpactRole;
  label: string;
  scope: 'company' | 'division' | 'project';
}

export const INTERNAL_ROLES: readonly RoleDefinition[] = [
  { key: 'platform_admin', label: 'Platform Admin', scope: 'company' },
  { key: 'executive', label: 'Executive', scope: 'company' },
  { key: 'operations_manager', label: 'Operations Manager', scope: 'division' },
  { key: 'project_manager', label: 'Project Manager', scope: 'project' },
  { key: 'project_coordinator', label: 'Project Coordinator', scope: 'project' },
  { key: 'estimator', label: 'Estimator', scope: 'division' },
  { key: 'field_supervisor', label: 'Field Supervisor', scope: 'project' },
  { key: 'accounting', label: 'Accounting', scope: 'company' },
  { key: 'payroll_admin', label: 'Payroll Admin', scope: 'company' },
] as const;

export const EXTERNAL_ROLES: readonly RoleDefinition[] = [
  { key: 'client_owner', label: 'Client Owner', scope: 'project' },
  { key: 'client_delegate', label: 'Client Delegate', scope: 'project' },
  { key: 'trade_partner_admin', label: 'Trade Partner Admin', scope: 'project' },
  { key: 'trade_partner_user', label: 'Trade Partner User', scope: 'project' },
] as const;

export const ALL_ROLES: readonly RoleDefinition[] = [...INTERNAL_ROLES, ...EXTERNAL_ROLES];

export const ALL_ROLE_KEYS = ALL_ROLES.map((r) => r.key);

// For Zod enum validation — a tuple type that z.enum() accepts
export const CANONICAL_ROLE_KEYS = ALL_ROLE_KEYS as unknown as readonly [string, ...string[]];
