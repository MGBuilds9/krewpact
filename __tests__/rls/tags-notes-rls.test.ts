/**
 * Tags & Notes RLS Policy Intent Tests
 *
 * Verifies that the migration 20260227_004_tags_notes_activities.sql
 * defines the correct RLS policies for tags, entity_tags, and notes tables.
 *
 * Tables covered:
 *   - tags           -- SELECT/INSERT/UPDATE/DELETE; write restricted to admin/ops/pm
 *   - entity_tags    -- SELECT/INSERT/DELETE; no UPDATE (junction table)
 *   - notes          -- SELECT/INSERT/UPDATE/DELETE; update/delete restricted to author or admin
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const migrationsDir = join(process.cwd(), 'supabase/migrations');
const MIGRATION_FILE = '20260227_004_tags_notes_activities.sql';

/**
 * Extract RLS policy operations per table from a migration SQL string.
 * Returns a map: table -> string[] of operations (SELECT | INSERT | UPDATE | DELETE).
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

/**
 * Extract the full SQL text of a named policy block.
 * Used to inspect USING / WITH CHECK clauses for specific conditions.
 */
function extractPolicyBlock(sql: string, policyName: string): string {
  const escapedName = policyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `CREATE\\s+POLICY\\s+${escapedName}\\s+ON\\s+\\w+[^;]+;`,
    'is',
  );
  const match = regex.exec(sql);
  return match ? match[0] : '';
}

const sql = readFileSync(join(migrationsDir, MIGRATION_FILE), 'utf-8');
const policies = extractPolicies(sql);

// ============================================================
// tags
// ============================================================
describe('tags RLS policies', () => {
  it('has SELECT policy', () => {
    expect(policies['tags']).toContain('SELECT');
  });

  it('has INSERT policy', () => {
    expect(policies['tags']).toContain('INSERT');
  });

  it('has UPDATE policy', () => {
    expect(policies['tags']).toContain('UPDATE');
  });

  it('has DELETE policy', () => {
    expect(policies['tags']).toContain('DELETE');
  });

  it('tags_insert requires is_platform_admin or elevated role', () => {
    const block = extractPolicyBlock(sql, 'tags_insert');
    expect(block).toBeTruthy();
    expect(block).toContain('is_platform_admin');
  });
});

// ============================================================
// entity_tags
// ============================================================
describe('entity_tags RLS policies', () => {
  it('has SELECT policy', () => {
    expect(policies['entity_tags']).toContain('SELECT');
  });

  it('has INSERT policy', () => {
    expect(policies['entity_tags']).toContain('INSERT');
  });

  it('has DELETE policy', () => {
    expect(policies['entity_tags']).toContain('DELETE');
  });

  it('does NOT have UPDATE policy (junction table -- no updates needed)', () => {
    expect(policies['entity_tags'] ?? []).not.toContain('UPDATE');
  });
});

// ============================================================
// notes
// ============================================================
describe('notes RLS policies', () => {
  it('has SELECT policy', () => {
    expect(policies['notes']).toContain('SELECT');
  });

  it('has INSERT policy', () => {
    expect(policies['notes']).toContain('INSERT');
  });

  it('has UPDATE policy', () => {
    expect(policies['notes']).toContain('UPDATE');
  });

  it('has DELETE policy', () => {
    expect(policies['notes']).toContain('DELETE');
  });

  it('notes_update requires created_by match or platform admin', () => {
    const block = extractPolicyBlock(sql, 'notes_update');
    expect(block).toBeTruthy();
    expect(block).toContain('created_by');
    expect(block).toContain('is_platform_admin');
  });

  it('notes_delete requires created_by match or platform admin', () => {
    const block = extractPolicyBlock(sql, 'notes_delete');
    expect(block).toBeTruthy();
    expect(block).toContain('created_by');
    expect(block).toContain('is_platform_admin');
  });
});
