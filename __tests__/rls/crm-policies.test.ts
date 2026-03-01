/**
 * RLS Policy Tests for CRM + Operations tables
 *
 * These tests validate the INTENT of RLS policies by testing the SQL helper
 * functions (krewpact_user_id, krewpact_divisions, krewpact_roles, is_platform_admin)
 * against mock JWT claims, and verifying the policy design logic.
 *
 * They do NOT require a live database — they test the policy rules as pure logic.
 */
import { describe, it, expect } from 'vitest';

// =====================================================
// Simulate the RLS helper function logic in TypeScript
// These mirror the SQL functions in 00002_rls_policies.sql
// =====================================================

interface JWTClaims {
  krewpact_user_id?: string;
  krewpact_divisions?: string[];
  krewpact_roles?: string[];
}

function krewpact_user_id(claims: JWTClaims): string {
  return claims.krewpact_user_id ?? '';
}

function krewpact_divisions(claims: JWTClaims): string[] {
  return claims.krewpact_divisions ?? [];
}

function krewpact_roles(claims: JWTClaims): string[] {
  return claims.krewpact_roles ?? [];
}

function is_platform_admin(claims: JWTClaims): boolean {
  return krewpact_roles(claims).includes('platform_admin');
}

// =====================================================
// Policy evaluation helpers — mirror the SQL USING clauses
// =====================================================

/** Division-scoped SELECT: user can see rows in their divisions, admin sees all */
function canSelectDivisionScoped(
  claims: JWTClaims,
  rowDivisionId: string
): boolean {
  if (is_platform_admin(claims)) return true;
  return krewpact_divisions(claims).includes(rowDivisionId);
}

/** Division-scoped INSERT/UPDATE/DELETE: user can modify rows in their divisions, admin can modify all */
function canModifyDivisionScoped(
  claims: JWTClaims,
  rowDivisionId: string
): boolean {
  if (is_platform_admin(claims)) return true;
  return krewpact_divisions(claims).includes(rowDivisionId);
}

/** User-owned: user can only access their own rows (e.g., expense_claims, notifications) */
function canAccessOwn(claims: JWTClaims, rowUserId: string): boolean {
  return krewpact_user_id(claims) === rowUserId;
}

/** User-owned + admin: user sees own, platform_admin sees all (e.g., expense_claims SELECT) */
function canSelectOwnOrAdmin(
  claims: JWTClaims,
  rowUserId: string
): boolean {
  if (is_platform_admin(claims)) return true;
  if (krewpact_roles(claims).includes('accounting')) return true;
  return krewpact_user_id(claims) === rowUserId;
}

/** Project member check: user is a member of the project */
function isProjectMember(
  claims: JWTClaims,
  projectMemberUserIds: string[]
): boolean {
  if (is_platform_admin(claims)) return true;
  return projectMemberUserIds.includes(krewpact_user_id(claims));
}

/** ERP sync tables: platform_admin or operations_manager only */
function canAccessErpSync(claims: JWTClaims): boolean {
  if (is_platform_admin(claims)) return true;
  return krewpact_roles(claims).includes('operations_manager');
}

// =====================================================
// Test JWT claim fixtures
// =====================================================
const USER_A: JWTClaims = {
  krewpact_user_id: 'user-a-uuid',
  krewpact_divisions: ['div-contracting'],
  krewpact_roles: ['project_manager'],
};

const USER_B: JWTClaims = {
  krewpact_user_id: 'user-b-uuid',
  krewpact_divisions: ['div-homes'],
  krewpact_roles: ['estimator'],
};

const MULTI_DIV_USER: JWTClaims = {
  krewpact_user_id: 'user-multi-uuid',
  krewpact_divisions: ['div-contracting', 'div-homes', 'div-telecom'],
  krewpact_roles: ['operations_manager'],
};

const ADMIN: JWTClaims = {
  krewpact_user_id: 'admin-uuid',
  krewpact_divisions: [],
  krewpact_roles: ['platform_admin'],
};

const ACCOUNTING_USER: JWTClaims = {
  krewpact_user_id: 'accounting-uuid',
  krewpact_divisions: ['div-contracting'],
  krewpact_roles: ['accounting'],
};

const EMPTY_CLAIMS: JWTClaims = {};

// =====================================================
// TESTS
// =====================================================

describe('RLS Helper Functions', () => {
  it('krewpact_user_id returns user ID from claims', () => {
    expect(krewpact_user_id(USER_A)).toBe('user-a-uuid');
  });

  it('krewpact_user_id returns empty string for missing claims', () => {
    expect(krewpact_user_id(EMPTY_CLAIMS)).toBe('');
  });

  it('krewpact_divisions returns array of division IDs', () => {
    expect(krewpact_divisions(MULTI_DIV_USER)).toEqual([
      'div-contracting',
      'div-homes',
      'div-telecom',
    ]);
  });

  it('krewpact_divisions returns empty array for missing claims', () => {
    expect(krewpact_divisions(EMPTY_CLAIMS)).toEqual([]);
  });

  it('is_platform_admin returns true for admin role', () => {
    expect(is_platform_admin(ADMIN)).toBe(true);
  });

  it('is_platform_admin returns false for non-admin role', () => {
    expect(is_platform_admin(USER_A)).toBe(false);
  });
});

describe('CRM Division-Scoped Policies (accounts, contacts, leads, opportunities, activities, opportunity_stage_history)', () => {
  it('user can SELECT rows in their own division', () => {
    expect(canSelectDivisionScoped(USER_A, 'div-contracting')).toBe(true);
  });

  it('user CANNOT SELECT rows in another division', () => {
    expect(canSelectDivisionScoped(USER_A, 'div-homes')).toBe(false);
  });

  it('platform_admin can SELECT rows in any division', () => {
    expect(canSelectDivisionScoped(ADMIN, 'div-homes')).toBe(true);
    expect(canSelectDivisionScoped(ADMIN, 'div-contracting')).toBe(true);
  });

  it('multi-division user can SELECT rows in all their divisions', () => {
    expect(canSelectDivisionScoped(MULTI_DIV_USER, 'div-contracting')).toBe(true);
    expect(canSelectDivisionScoped(MULTI_DIV_USER, 'div-homes')).toBe(true);
    expect(canSelectDivisionScoped(MULTI_DIV_USER, 'div-telecom')).toBe(true);
  });

  it('multi-division user CANNOT SELECT rows in divisions they do not belong to', () => {
    expect(canSelectDivisionScoped(MULTI_DIV_USER, 'div-wood')).toBe(false);
  });

  it('user can INSERT/UPDATE/DELETE rows in their own division', () => {
    expect(canModifyDivisionScoped(USER_A, 'div-contracting')).toBe(true);
  });

  it('user CANNOT INSERT/UPDATE/DELETE rows in another division', () => {
    expect(canModifyDivisionScoped(USER_A, 'div-homes')).toBe(false);
  });

  it('platform_admin can INSERT/UPDATE/DELETE rows in any division', () => {
    expect(canModifyDivisionScoped(ADMIN, 'div-wood')).toBe(true);
  });
});

describe('Estimating Division-Scoped Policies (estimates, estimate_lines via parent, estimate_versions)', () => {
  it('estimator in div-homes can SELECT estimates in their division', () => {
    expect(canSelectDivisionScoped(USER_B, 'div-homes')).toBe(true);
  });

  it('estimator in div-homes CANNOT SELECT estimates in contracting division', () => {
    expect(canSelectDivisionScoped(USER_B, 'div-contracting')).toBe(false);
  });

  it('platform_admin can SELECT all estimates regardless of division', () => {
    expect(canSelectDivisionScoped(ADMIN, 'div-homes')).toBe(true);
  });
});

describe('Project Member-Based Policies (projects, project_members, milestones, tasks, task_comments, daily_logs)', () => {
  const projectMembers = ['user-a-uuid', 'user-b-uuid'];

  it('project member can SELECT project data', () => {
    expect(isProjectMember(USER_A, projectMembers)).toBe(true);
  });

  it('non-member CANNOT SELECT project data', () => {
    expect(isProjectMember(MULTI_DIV_USER, projectMembers)).toBe(false);
  });

  it('platform_admin can SELECT any project regardless of membership', () => {
    expect(isProjectMember(ADMIN, projectMembers)).toBe(true);
  });

  it('platform_admin can access project even with empty member list', () => {
    expect(isProjectMember(ADMIN, [])).toBe(true);
  });
});

describe('Expense Claims Policies (user-owned + accounting/admin visibility)', () => {
  it('user can SELECT their own expense claims', () => {
    expect(canSelectOwnOrAdmin(USER_A, 'user-a-uuid')).toBe(true);
  });

  it('user CANNOT SELECT another user expense claims', () => {
    expect(canSelectOwnOrAdmin(USER_A, 'user-b-uuid')).toBe(false);
  });

  it('accounting role can SELECT all expense claims', () => {
    expect(canSelectOwnOrAdmin(ACCOUNTING_USER, 'user-b-uuid')).toBe(true);
  });

  it('platform_admin can SELECT all expense claims', () => {
    expect(canSelectOwnOrAdmin(ADMIN, 'user-b-uuid')).toBe(true);
  });

  it('user can only modify own expense claims', () => {
    expect(canAccessOwn(USER_A, 'user-a-uuid')).toBe(true);
    expect(canAccessOwn(USER_A, 'user-b-uuid')).toBe(false);
  });
});

describe('Notification Policies (user-owned only)', () => {
  it('user can SELECT their own notifications', () => {
    expect(canAccessOwn(USER_A, 'user-a-uuid')).toBe(true);
  });

  it('user CANNOT SELECT another user notifications', () => {
    expect(canAccessOwn(USER_A, 'user-b-uuid')).toBe(false);
  });

  it('platform_admin cannot see others notifications (user-only policy)', () => {
    // Notifications are strictly user-scoped, even admins only see their own
    expect(canAccessOwn(ADMIN, 'user-a-uuid')).toBe(false);
  });
});

describe('ERP Sync Table Policies (platform_admin + operations_manager only)', () => {
  it('platform_admin can access ERP sync tables', () => {
    expect(canAccessErpSync(ADMIN)).toBe(true);
  });

  it('operations_manager can access ERP sync tables', () => {
    expect(canAccessErpSync(MULTI_DIV_USER)).toBe(true);
  });

  it('regular project_manager CANNOT access ERP sync tables', () => {
    expect(canAccessErpSync(USER_A)).toBe(false);
  });

  it('estimator CANNOT access ERP sync tables', () => {
    expect(canAccessErpSync(USER_B)).toBe(false);
  });

  it('accounting role CANNOT access ERP sync tables', () => {
    expect(canAccessErpSync(ACCOUNTING_USER)).toBe(false);
  });
});

describe('Contacts inherit access from parent account division', () => {
  // Contacts don't have their own division_id — they inherit via account_id.
  // The RLS policy for contacts joins to accounts to check division access.
  // Here we simulate: contact belongs to account in div-contracting.

  it('user in same division as the account can access the contact', () => {
    // If the account is in div-contracting, and user has div-contracting
    const accountDivision = 'div-contracting';
    expect(canSelectDivisionScoped(USER_A, accountDivision)).toBe(true);
  });

  it('user in different division CANNOT access the contact', () => {
    const accountDivision = 'div-contracting';
    expect(canSelectDivisionScoped(USER_B, accountDivision)).toBe(false);
  });
});

describe('Activities inherit access from linked entity division', () => {
  // Activities don't have division_id directly.
  // Access is granted if the user has access to any of the linked entities.

  it('user can access activity linked to an opportunity in their division', () => {
    // Activity linked to opportunity in div-contracting
    const linkedDivision = 'div-contracting';
    expect(canSelectDivisionScoped(USER_A, linkedDivision)).toBe(true);
  });

  it('user CANNOT access activity linked to entity in another division', () => {
    const linkedDivision = 'div-homes';
    expect(canSelectDivisionScoped(USER_A, linkedDivision)).toBe(false);
  });
});
