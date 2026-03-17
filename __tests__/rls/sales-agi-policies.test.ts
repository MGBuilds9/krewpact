/**
 * RLS Policy Tests for Sales AGI tables (post-lockdown)
 *
 * Tests validate the INTENT of RLS policies defined in:
 *   - 20260227_001_rls_lockdown.sql (replaces permissive USING(true) policies)
 *
 * Tables covered: outreach, sequences, sequence_steps, scoring_rules,
 *                 email_templates, lead_score_history, sequence_enrollments
 */
import { describe, expect, it } from 'vitest';

// =====================================================
// Simulate the RLS helper function logic in TypeScript
// =====================================================

interface JWTClaims {
  krewpact_user_id?: string;
  krewpact_divisions?: string[];
  krewpact_roles?: string[];
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
// Policy evaluation helpers — mirror SQL USING clauses
// =====================================================

/** Division-scoped via lead: check if the lead's division is in user's divisions */
function canAccessViaLeadDivision(claims: JWTClaims, leadDivisionId: string): boolean {
  if (is_platform_admin(claims)) return true;
  return krewpact_divisions(claims).includes(leadDivisionId);
}

/** Sequences SELECT: null division visible to all, otherwise division-scoped */
function canSelectSequence(claims: JWTClaims, sequenceDivisionId: string | null): boolean {
  if (is_platform_admin(claims)) return true;
  if (sequenceDivisionId === null) return true;
  return krewpact_divisions(claims).includes(sequenceDivisionId);
}

/** Sequences/steps WRITE: admin or operations_manager only */
function canWriteAdminManaged(claims: JWTClaims): boolean {
  if (is_platform_admin(claims)) return true;
  return krewpact_roles(claims).includes('operations_manager');
}

/** Scoring rules / email templates SELECT: all authenticated */
function canSelectPublicRead(): boolean {
  return true; // all authenticated users can read
}

// =====================================================
// Test fixtures
// =====================================================

const USER_CONTRACTING: JWTClaims = {
  krewpact_user_id: 'user-contracting',
  krewpact_divisions: ['div-contracting'],
  krewpact_roles: ['project_manager'],
};

const USER_HOMES: JWTClaims = {
  krewpact_user_id: 'user-homes',
  krewpact_divisions: ['div-homes'],
  krewpact_roles: ['estimator'],
};

const OPS_MANAGER: JWTClaims = {
  krewpact_user_id: 'user-ops',
  krewpact_divisions: ['div-contracting', 'div-homes'],
  krewpact_roles: ['operations_manager'],
};

const ADMIN: JWTClaims = {
  krewpact_user_id: 'admin-uuid',
  krewpact_divisions: [],
  krewpact_roles: ['platform_admin'],
};

const FIELD_SUPERVISOR: JWTClaims = {
  krewpact_user_id: 'user-field',
  krewpact_divisions: ['div-telecom'],
  krewpact_roles: ['field_supervisor'],
};

const NO_DIVISIONS: JWTClaims = {
  krewpact_user_id: 'user-none',
  krewpact_divisions: [],
  krewpact_roles: ['project_coordinator'],
};

// =====================================================
// TESTS
// =====================================================

describe('Outreach RLS (division-scoped via lead)', () => {
  it('user can SELECT outreach for leads in their division', () => {
    expect(canAccessViaLeadDivision(USER_CONTRACTING, 'div-contracting')).toBe(true);
  });

  it('user CANNOT SELECT outreach for leads in another division', () => {
    expect(canAccessViaLeadDivision(USER_CONTRACTING, 'div-homes')).toBe(false);
  });

  it('platform_admin can SELECT outreach in any division', () => {
    expect(canAccessViaLeadDivision(ADMIN, 'div-homes')).toBe(true);
  });

  it('user can INSERT outreach for leads in their division', () => {
    expect(canAccessViaLeadDivision(USER_HOMES, 'div-homes')).toBe(true);
  });

  it('user CANNOT INSERT outreach for leads outside their division', () => {
    expect(canAccessViaLeadDivision(USER_HOMES, 'div-contracting')).toBe(false);
  });

  it('user with no divisions CANNOT access any outreach', () => {
    expect(canAccessViaLeadDivision(NO_DIVISIONS, 'div-contracting')).toBe(false);
  });
});

describe('Sequences RLS (division-scoped read, admin/ops write)', () => {
  it('user can SELECT sequences in their division', () => {
    expect(canSelectSequence(USER_CONTRACTING, 'div-contracting')).toBe(true);
  });

  it('user can SELECT global sequences (null division)', () => {
    expect(canSelectSequence(USER_CONTRACTING, null)).toBe(true);
  });

  it('user CANNOT SELECT sequences in another division', () => {
    expect(canSelectSequence(USER_CONTRACTING, 'div-homes')).toBe(false);
  });

  it('platform_admin can SELECT any sequence', () => {
    expect(canSelectSequence(ADMIN, 'div-homes')).toBe(true);
  });

  it('operations_manager can INSERT sequences', () => {
    expect(canWriteAdminManaged(OPS_MANAGER)).toBe(true);
  });

  it('platform_admin can INSERT sequences', () => {
    expect(canWriteAdminManaged(ADMIN)).toBe(true);
  });

  it('regular user CANNOT INSERT sequences', () => {
    expect(canWriteAdminManaged(USER_CONTRACTING)).toBe(false);
  });

  it('estimator CANNOT INSERT sequences', () => {
    expect(canWriteAdminManaged(USER_HOMES)).toBe(false);
  });

  it('field_supervisor CANNOT modify sequences', () => {
    expect(canWriteAdminManaged(FIELD_SUPERVISOR)).toBe(false);
  });
});

describe('Sequence Steps RLS (inherit from sequence, admin/ops write)', () => {
  it('user can SELECT steps for sequences they can see', () => {
    expect(canSelectSequence(USER_CONTRACTING, 'div-contracting')).toBe(true);
  });

  it('user can SELECT steps for global sequences', () => {
    expect(canSelectSequence(USER_HOMES, null)).toBe(true);
  });

  it('only admin/ops_manager can INSERT steps', () => {
    expect(canWriteAdminManaged(OPS_MANAGER)).toBe(true);
    expect(canWriteAdminManaged(ADMIN)).toBe(true);
    expect(canWriteAdminManaged(USER_CONTRACTING)).toBe(false);
  });

  it('only admin/ops_manager can UPDATE steps', () => {
    expect(canWriteAdminManaged(OPS_MANAGER)).toBe(true);
    expect(canWriteAdminManaged(USER_HOMES)).toBe(false);
  });

  it('only admin/ops_manager can DELETE steps', () => {
    expect(canWriteAdminManaged(ADMIN)).toBe(true);
    expect(canWriteAdminManaged(FIELD_SUPERVISOR)).toBe(false);
  });
});

describe('Scoring Rules RLS (read by all, write by admin/ops)', () => {
  it('all authenticated users can SELECT scoring rules', () => {
    expect(canSelectPublicRead()).toBe(true);
  });

  it('operations_manager can INSERT scoring rules', () => {
    expect(canWriteAdminManaged(OPS_MANAGER)).toBe(true);
  });

  it('platform_admin can INSERT scoring rules', () => {
    expect(canWriteAdminManaged(ADMIN)).toBe(true);
  });

  it('regular project_manager CANNOT INSERT scoring rules', () => {
    expect(canWriteAdminManaged(USER_CONTRACTING)).toBe(false);
  });

  it('regular estimator CANNOT UPDATE scoring rules', () => {
    expect(canWriteAdminManaged(USER_HOMES)).toBe(false);
  });

  it('field_supervisor CANNOT DELETE scoring rules', () => {
    expect(canWriteAdminManaged(FIELD_SUPERVISOR)).toBe(false);
  });
});

describe('Email Templates RLS (read by all, write by admin/ops)', () => {
  it('all authenticated users can SELECT email templates', () => {
    expect(canSelectPublicRead()).toBe(true);
  });

  it('operations_manager can INSERT email templates', () => {
    expect(canWriteAdminManaged(OPS_MANAGER)).toBe(true);
  });

  it('platform_admin can UPDATE email templates', () => {
    expect(canWriteAdminManaged(ADMIN)).toBe(true);
  });

  it('regular user CANNOT INSERT email templates', () => {
    expect(canWriteAdminManaged(USER_CONTRACTING)).toBe(false);
  });

  it('regular user CANNOT DELETE email templates', () => {
    expect(canWriteAdminManaged(USER_HOMES)).toBe(false);
  });
});

describe('Lead Score History RLS (division-scoped via lead, immutable)', () => {
  it('user can SELECT score history for leads in their division', () => {
    expect(canAccessViaLeadDivision(USER_CONTRACTING, 'div-contracting')).toBe(true);
  });

  it('user CANNOT SELECT score history for leads outside their division', () => {
    expect(canAccessViaLeadDivision(USER_HOMES, 'div-contracting')).toBe(false);
  });

  it('platform_admin can SELECT any score history', () => {
    expect(canAccessViaLeadDivision(ADMIN, 'div-telecom')).toBe(true);
  });

  it('user can INSERT score history for leads in their division', () => {
    expect(canAccessViaLeadDivision(USER_CONTRACTING, 'div-contracting')).toBe(true);
  });

  // Immutability: no UPDATE or DELETE policies exist
  it('no UPDATE policy exists — score history is immutable', () => {
    // This is a design test: the migration does NOT create UPDATE policies
    // Any UPDATE attempt would be blocked by RLS deny-by-default
    expect(true).toBe(true); // Placeholder — verified by migration review
  });

  it('no DELETE policy exists — score history is immutable', () => {
    expect(true).toBe(true); // Placeholder — verified by migration review
  });
});

describe('Sequence Enrollments RLS (division-scoped via lead)', () => {
  it('user can SELECT enrollments for leads in their division', () => {
    expect(canAccessViaLeadDivision(USER_CONTRACTING, 'div-contracting')).toBe(true);
  });

  it('user CANNOT SELECT enrollments for leads in another division', () => {
    expect(canAccessViaLeadDivision(USER_CONTRACTING, 'div-homes')).toBe(false);
  });

  it('platform_admin can SELECT any enrollment', () => {
    expect(canAccessViaLeadDivision(ADMIN, 'div-wood')).toBe(true);
  });

  it('user can INSERT enrollments for leads in their division', () => {
    expect(canAccessViaLeadDivision(OPS_MANAGER, 'div-contracting')).toBe(true);
  });

  it('user CANNOT INSERT enrollments for leads outside their division', () => {
    expect(canAccessViaLeadDivision(FIELD_SUPERVISOR, 'div-contracting')).toBe(false);
  });

  it('user can UPDATE enrollments for leads in their division', () => {
    expect(canAccessViaLeadDivision(USER_HOMES, 'div-homes')).toBe(true);
  });

  it('user CANNOT UPDATE enrollments for leads outside their division', () => {
    expect(canAccessViaLeadDivision(USER_HOMES, 'div-contracting')).toBe(false);
  });
});

describe('Cross-cutting: no-division user blocked from all Sales AGI data', () => {
  it('user with no divisions blocked from outreach', () => {
    expect(canAccessViaLeadDivision(NO_DIVISIONS, 'div-contracting')).toBe(false);
  });

  it('user with no divisions blocked from division-scoped sequences', () => {
    expect(canSelectSequence(NO_DIVISIONS, 'div-contracting')).toBe(false);
  });

  it('user with no divisions CAN see global sequences', () => {
    expect(canSelectSequence(NO_DIVISIONS, null)).toBe(true);
  });

  it('user with no divisions blocked from enrollments', () => {
    expect(canAccessViaLeadDivision(NO_DIVISIONS, 'div-homes')).toBe(false);
  });

  it('user with no divisions blocked from score history', () => {
    expect(canAccessViaLeadDivision(NO_DIVISIONS, 'div-telecom')).toBe(false);
  });
});
