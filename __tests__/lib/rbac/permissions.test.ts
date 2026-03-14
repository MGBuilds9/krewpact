import { describe, it, expect } from 'vitest';
import {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  getPermissions,
  isAdmin,
  isInternalRole,
  isExternalRole,
  roleHasPermission,
} from '@/lib/rbac/permissions.shared';
import type { KrewpactRole, Permission } from '@/lib/rbac/permissions.shared';

describe('isInternalRole', () => {
  it('returns true for all internal roles', () => {
    const internalRoles: KrewpactRole[] = [
      'platform_admin',
      'executive',
      'operations_manager',
      'project_manager',
      'project_coordinator',
      'estimator',
      'field_supervisor',
      'accounting',
      'payroll_admin',
    ];
    for (const role of internalRoles) {
      expect(isInternalRole(role)).toBe(true);
    }
  });

  it('returns false for external roles', () => {
    expect(isInternalRole('client_owner')).toBe(false);
    expect(isInternalRole('trade_partner_admin')).toBe(false);
  });

  it('returns false for unknown strings', () => {
    expect(isInternalRole('unknown_role')).toBe(false);
    expect(isInternalRole('')).toBe(false);
  });
});

describe('isExternalRole', () => {
  it('returns true for all external roles', () => {
    const externalRoles: KrewpactRole[] = [
      'client_owner',
      'client_delegate',
      'trade_partner_admin',
      'trade_partner_user',
    ];
    for (const role of externalRoles) {
      expect(isExternalRole(role)).toBe(true);
    }
  });

  it('returns false for internal roles', () => {
    expect(isExternalRole('platform_admin')).toBe(false);
    expect(isExternalRole('accounting')).toBe(false);
  });

  it('returns false for unknown strings', () => {
    expect(isExternalRole('random')).toBe(false);
  });
});

describe('isAdmin', () => {
  it('returns true only when platform_admin is in the roles array', () => {
    expect(isAdmin(['platform_admin'])).toBe(true);
    expect(isAdmin(['platform_admin', 'executive'])).toBe(true);
  });

  it('returns false for any non-admin role', () => {
    expect(isAdmin(['executive'])).toBe(false);
    expect(isAdmin(['operations_manager', 'project_manager'])).toBe(false);
    expect(isAdmin([])).toBe(false);
  });
});

describe('roleHasPermission', () => {
  it('returns true for a permission the role has', () => {
    expect(roleHasPermission('estimator', 'estimates.edit')).toBe(true);
    expect(roleHasPermission('accounting', 'finance.admin')).toBe(true);
    expect(roleHasPermission('field_supervisor', 'safety.edit')).toBe(true);
  });

  it('returns false for a permission the role lacks', () => {
    expect(roleHasPermission('payroll_admin', 'crm.view')).toBe(false);
    expect(roleHasPermission('field_supervisor', 'finance.edit')).toBe(false);
    expect(roleHasPermission('client_delegate', 'crm.view')).toBe(false);
  });

  it('platform_admin has every permission', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(roleHasPermission('platform_admin', permission)).toBe(true);
    }
  });
});

describe('hasPermission', () => {
  it('returns true when any role in the array has the permission', () => {
    expect(hasPermission(['project_coordinator', 'estimator'], 'estimates.edit')).toBe(true);
  });

  it('returns true for a single matching role', () => {
    expect(hasPermission(['accounting'], 'finance.view')).toBe(true);
  });

  it('returns false when no role has the permission', () => {
    expect(hasPermission(['payroll_admin', 'client_delegate'], 'crm.edit')).toBe(false);
  });

  it('returns false for an empty roles array', () => {
    expect(hasPermission([], 'crm.view')).toBe(false);
  });

  it('returns true for platform_admin on any permission', () => {
    const permission: Permission = 'admin.system';
    expect(hasPermission(['platform_admin'], permission)).toBe(true);
  });
});

describe('getPermissions', () => {
  it('returns all permissions for platform_admin', () => {
    const perms = getPermissions(['platform_admin']);
    expect(perms.sort()).toEqual([...ALL_PERMISSIONS].sort());
  });

  it('aggregates permissions from multiple roles without duplicates', () => {
    // Both estimator and accounting have 'crm.view'
    const perms = getPermissions(['estimator', 'accounting']);
    const crmViewCount = perms.filter((p) => p === 'crm.view').length;
    expect(crmViewCount).toBe(1);
    // Should include permissions from both
    expect(perms).toContain('estimates.admin');
    expect(perms).toContain('finance.admin');
  });

  it('returns empty array for empty roles', () => {
    expect(getPermissions([])).toEqual([]);
  });

  it('returns only permissions for a single role', () => {
    const perms = getPermissions(['payroll_admin']);
    expect(perms).toEqual(['finance.view']);
  });

  it('returns deduplicated union for overlapping roles', () => {
    const perms = getPermissions(['project_manager', 'project_coordinator']);
    // projects.view appears in both
    const projectsViewCount = perms.filter((p) => p === 'projects.view').length;
    expect(projectsViewCount).toBe(1);
    // project_manager has crm.edit, coordinator does not
    expect(perms).toContain('crm.edit');
    // Both have field_ops.edit
    expect(perms).toContain('field_ops.edit');
  });
});

describe('ROLE_PERMISSIONS matrix', () => {
  it('covers all KrewpactRole keys', () => {
    const expectedRoles: KrewpactRole[] = [
      'platform_admin',
      'executive',
      'operations_manager',
      'project_manager',
      'project_coordinator',
      'estimator',
      'field_supervisor',
      'accounting',
      'payroll_admin',
      'client_owner',
      'client_delegate',
      'trade_partner_admin',
      'trade_partner_user',
    ];
    for (const role of expectedRoles) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    }
  });

  it('platform_admin has every permission in ALL_PERMISSIONS', () => {
    for (const p of ALL_PERMISSIONS) {
      expect(ROLE_PERMISSIONS.platform_admin).toContain(p);
    }
  });

  it('external roles have restricted permissions', () => {
    // External roles should not have admin or finance permissions
    const restricted: Permission[] = ['admin.system', 'finance.admin', 'roles.manage', 'users.manage'];
    const externalRoles: KrewpactRole[] = [
      'client_owner',
      'client_delegate',
      'trade_partner_admin',
      'trade_partner_user',
    ];
    for (const role of externalRoles) {
      for (const perm of restricted) {
        expect(ROLE_PERMISSIONS[role]).not.toContain(perm);
      }
    }
  });

  it('payroll_admin has only finance.view', () => {
    expect(ROLE_PERMISSIONS.payroll_admin).toEqual(['finance.view']);
  });
});

describe('ALL_PERMISSIONS', () => {
  it('contains no duplicate entries', () => {
    const unique = new Set(ALL_PERMISSIONS);
    expect(unique.size).toBe(ALL_PERMISSIONS.length);
  });

  it('includes expected permission strings', () => {
    expect(ALL_PERMISSIONS).toContain('crm.admin');
    expect(ALL_PERMISSIONS).toContain('admin.system');
    expect(ALL_PERMISSIONS).toContain('roles.manage');
    expect(ALL_PERMISSIONS).toContain('portals.manage');
  });
});
