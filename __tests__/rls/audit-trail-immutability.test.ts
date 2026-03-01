/**
 * Audit Trail Immutability Tests
 *
 * Verifies that history/audit tables have NO UPDATE or DELETE RLS policies,
 * making them immutable by design (deny-by-default blocks any mutation).
 *
 * Tables covered:
 *   - opportunity_stage_history (from 00004_crm_rls_policies.sql)
 *   - lead_stage_history (from 20260227_003_lead_stage_history.sql)
 *   - lead_score_history (from 20260227_001_rls_lockdown.sql)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Parse a migration SQL file and extract policy names.
 * Returns an object mapping table names to arrays of policy operations (SELECT, INSERT, UPDATE, DELETE).
 */
function extractPolicies(sql: string): Record<string, string[]> {
  const policies: Record<string, string[]> = {};
  const policyRegex = /CREATE\s+POLICY\s+\w+\s+ON\s+(\w+)\s+FOR\s+(SELECT|INSERT|UPDATE|DELETE)/gi;
  let match;

  while ((match = policyRegex.exec(sql)) !== null) {
    const table = match[1].toLowerCase();
    const operation = match[2].toUpperCase();
    if (!policies[table]) policies[table] = [];
    policies[table].push(operation);
  }

  return policies;
}

const migrationsDir = join(process.cwd(), 'supabase/migrations');

describe('Audit Trail Immutability', () => {
  describe('opportunity_stage_history', () => {
    it('has SELECT and INSERT policies only', () => {
      const sql = readFileSync(
        join(migrationsDir, '00004_crm_rls_policies.sql'),
        'utf-8'
      );
      const policies = extractPolicies(sql);
      const ops = policies['opportunity_stage_history'] ?? [];
      expect(ops).toContain('SELECT');
      expect(ops).toContain('INSERT');
      expect(ops).not.toContain('UPDATE');
      expect(ops).not.toContain('DELETE');
    });
  });

  describe('lead_stage_history', () => {
    it('has SELECT and INSERT policies only', () => {
      const sql = readFileSync(
        join(migrationsDir, '20260227_003_lead_stage_history.sql'),
        'utf-8'
      );
      const policies = extractPolicies(sql);
      const ops = policies['lead_stage_history'] ?? [];
      expect(ops).toContain('SELECT');
      expect(ops).toContain('INSERT');
      expect(ops).not.toContain('UPDATE');
      expect(ops).not.toContain('DELETE');
    });
  });

  describe('lead_score_history', () => {
    it('has SELECT and INSERT policies only', () => {
      const sql = readFileSync(
        join(migrationsDir, '20260227_001_rls_lockdown.sql'),
        'utf-8'
      );
      const policies = extractPolicies(sql);
      const ops = policies['lead_score_history'] ?? [];
      expect(ops).toContain('SELECT');
      expect(ops).toContain('INSERT');
      expect(ops).not.toContain('UPDATE');
      expect(ops).not.toContain('DELETE');
    });
  });

  describe('ERP sync events (immutable log)', () => {
    it('erp_sync_events has SELECT and INSERT only', () => {
      const sql = readFileSync(
        join(migrationsDir, '00004_crm_rls_policies.sql'),
        'utf-8'
      );
      const policies = extractPolicies(sql);
      const ops = policies['erp_sync_events'] ?? [];
      expect(ops).toContain('SELECT');
      expect(ops).toContain('INSERT');
      expect(ops).not.toContain('UPDATE');
      expect(ops).not.toContain('DELETE');
    });

    it('erp_sync_errors has SELECT and INSERT only', () => {
      const sql = readFileSync(
        join(migrationsDir, '00004_crm_rls_policies.sql'),
        'utf-8'
      );
      const policies = extractPolicies(sql);
      const ops = policies['erp_sync_errors'] ?? [];
      expect(ops).toContain('SELECT');
      expect(ops).toContain('INSERT');
      expect(ops).not.toContain('UPDATE');
      expect(ops).not.toContain('DELETE');
    });
  });

  describe('estimate_versions (immutable snapshots)', () => {
    it('has SELECT and INSERT policies only', () => {
      const sql = readFileSync(
        join(migrationsDir, '00004_crm_rls_policies.sql'),
        'utf-8'
      );
      const policies = extractPolicies(sql);
      const ops = policies['estimate_versions'] ?? [];
      expect(ops).toContain('SELECT');
      expect(ops).toContain('INSERT');
      expect(ops).not.toContain('UPDATE');
      expect(ops).not.toContain('DELETE');
    });
  });
});
