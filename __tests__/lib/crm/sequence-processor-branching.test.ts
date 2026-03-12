import { describe, it, expect, vi } from 'vitest';
import { evaluateCondition, processSequences } from '@/lib/crm/sequence-processor';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a deeply chainable supabase mock where every method returns itself.
 * `single()` and `maybeSingle()` resolve with the given response for the table.
 */
function createChainableMock(responses: Record<string, { data: unknown; error: unknown }>) {
  const mock = {
    from: vi.fn((table: string) => {
      const tableRes = responses[table] ?? { data: null, error: null };

      const chain: Record<string, unknown> = {};
      const methods = [
        'select',
        'insert',
        'update',
        'delete',
        'eq',
        'lte',
        'gte',
        'gt',
        'lt',
        'neq',
        'order',
        'limit',
        'range',
        'ilike',
        'is',
        'not',
        'or',
        'filter',
        'match',
        'in',
        'contains',
        'containedBy',
      ];
      for (const m of methods) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }
      chain.single = vi.fn().mockResolvedValue(tableRes);
      chain.maybeSingle = vi.fn().mockResolvedValue(tableRes);
      return chain;
    }),
  };
  return mock as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// evaluateCondition
// ---------------------------------------------------------------------------

describe('evaluateCondition', () => {
  const baseEnrollment: Record<string, unknown> = {
    id: 'enroll-1',
    lead_id: 'lead-1',
    contact_id: 'contact-1',
    sequence_id: 'seq-1',
    current_step: 1,
    status: 'active',
  };

  it('if_score: returns true when lead score >= threshold', async () => {
    const supabase = createChainableMock({
      leads: { data: { lead_score: 80 }, error: null },
    });
    const result = await evaluateCondition(supabase, baseEnrollment, 'if_score', { threshold: 70 });
    expect(result).toBe(true);
  });

  it('if_score: returns false when lead score < threshold', async () => {
    const supabase = createChainableMock({
      leads: { data: { lead_score: 30 }, error: null },
    });
    const result = await evaluateCondition(supabase, baseEnrollment, 'if_score', { threshold: 70 });
    expect(result).toBe(false);
  });

  it('if_email_opened: returns true when outreach has opened_at', async () => {
    const supabase = createChainableMock({
      outreach: { data: { id: 'oe-1', opened_at: '2026-02-01T00:00:00Z' }, error: null },
    });
    const result = await evaluateCondition(supabase, baseEnrollment, 'if_email_opened', {});
    expect(result).toBe(true);
  });

  it('if_replied: returns true when outreach has replied_at', async () => {
    const supabase = createChainableMock({
      outreach: { data: { id: 'oe-1', replied_at: '2026-02-01T00:00:00Z' }, error: null },
    });
    const result = await evaluateCondition(supabase, baseEnrollment, 'if_replied', {});
    expect(result).toBe(true);
  });

  it('if_tag: returns true when entity_tag exists', async () => {
    const supabase = createChainableMock({
      entity_tags: { data: { id: 'et-1' }, error: null },
    });
    const result = await evaluateCondition(supabase, baseEnrollment, 'if_tag', {
      tag_id: 'tag-xyz',
    });
    expect(result).toBe(true);
  });

  it('if_stage: returns true when lead is at specified stage', async () => {
    const supabase = createChainableMock({
      leads: { data: { stage: 'qualified' }, error: null },
    });
    const result = await evaluateCondition(supabase, baseEnrollment, 'if_stage', {
      stage: 'qualified',
    });
    expect(result).toBe(true);
  });

  it('returns false for unknown condition type', async () => {
    const supabase = createChainableMock({});
    const result = await evaluateCondition(supabase, baseEnrollment, 'if_unknown' as never, {});
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// processSequences — branching scenarios
// ---------------------------------------------------------------------------

describe('processSequences (branching)', () => {
  it('returns empty result when no active enrollments', async () => {
    // processSequences uses .range() and resolves via awaiting the chain
    // We need the chain to resolve with the enrollment data
    const mock = {
      from: vi.fn(() => {
        const chain: Record<string, unknown> = {};
        const methods = [
          'select',
          'insert',
          'update',
          'delete',
          'eq',
          'lte',
          'gte',
          'order',
          'limit',
          'range',
          'neq',
          'is',
          'not',
          'or',
          'filter',
        ];
        for (const m of methods) {
          chain[m] = vi.fn().mockReturnValue(chain);
        }
        chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
        // Make chain thenable — resolves with empty enrollments
        chain.then = (resolve: (v: unknown) => void) =>
          Promise.resolve(resolve({ data: [], error: null }));
        return chain;
      }),
    };

    const result = await processSequences(mock as unknown as SupabaseClient);
    expect(result).toEqual({ processed: 0, completed: 0, errors: [], deadLettered: 0 });
  });
});
