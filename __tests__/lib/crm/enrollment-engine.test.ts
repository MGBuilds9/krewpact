import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  approveEnrollment,
  evaluateTrigger,
  matchesConditions,
  rejectEnrollment,
} from '@/lib/crm/enrollment-engine';

// ---------------------------------------------------------------------------
// matchesConditions — pure function, no mocks needed
// ---------------------------------------------------------------------------

describe('matchesConditions', () => {
  it('on_stage_change: matches when stage equals conditions.stage', () => {
    const result = matchesConditions(
      'on_stage_change',
      { stage: 'qualified' },
      { stage: 'qualified' },
    );
    expect(result).toBe(true);
  });

  it('on_stage_change: no match when stage differs', () => {
    const result = matchesConditions('on_stage_change', { stage: 'qualified' }, { stage: 'new' });
    expect(result).toBe(false);
  });

  it('on_score_threshold: matches when score >= min_score', () => {
    const result = matchesConditions('on_score_threshold', { min_score: 50 }, { score: 75 });
    expect(result).toBe(true);
  });

  it('on_score_threshold: no match when score < min_score', () => {
    const result = matchesConditions('on_score_threshold', { min_score: 80 }, { score: 40 });
    expect(result).toBe(false);
  });

  it('on_tag_added: matches when tag_id equals conditions.tag_id', () => {
    const result = matchesConditions('on_tag_added', { tag_id: 'tag-abc' }, { tag_id: 'tag-abc' });
    expect(result).toBe(true);
  });

  it('on_lead_created: always matches', () => {
    const result = matchesConditions('on_lead_created', {}, {});
    expect(result).toBe(true);
  });

  it('returns false for unknown trigger type', () => {
    const result = matchesConditions('on_unknown_event' as never, {}, {});
    expect(result).toBe(false);
  });

  it('on_stage_change returns true when conditions is null (no filter)', () => {
    const result = matchesConditions('on_stage_change', null, { stage: 'qualified' });
    expect(result).toBe(true);
  });

  it('on_score_threshold returns false when conditions is null', () => {
    const result = matchesConditions('on_score_threshold', null, { score: 50 });
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// matchesConditions — on_form_submitted
// ---------------------------------------------------------------------------

describe('matchesConditions — form_submitted', () => {
  it('on_form_submitted: matches when form_id matches', () => {
    const result = matchesConditions(
      'on_form_submitted',
      { form_id: 'form-1' },
      { form_id: 'form-1' },
    );
    expect(result).toBe(true);
  });

  it('on_form_submitted: no match when form_id differs', () => {
    const result = matchesConditions(
      'on_form_submitted',
      { form_id: 'form-1' },
      { form_id: 'form-2' },
    );
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// approveEnrollment / rejectEnrollment — require supabase mock
// ---------------------------------------------------------------------------

function createMockSupabase(updateResult: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ['from', 'update', 'eq', 'select', 'insert', 'delete'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(updateResult);
  // Make chain thenable so `await supabase.from().update().eq().eq()` resolves with updateResult
  chain.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(updateResult));
  return chain as unknown as SupabaseClient;
}

describe('approveEnrollment', () => {
  it('returns success true when db update succeeds', async () => {
    const supabase = createMockSupabase({
      data: { id: 'enrollment-1', status: 'active' },
      error: null,
    });
    const result = await approveEnrollment(supabase, 'enrollment-1');
    expect(result.success).toBe(true);
  });

  it('returns error when db update fails', async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: 'DB constraint violation' },
    });
    const result = await approveEnrollment(supabase, 'enrollment-bad');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('rejectEnrollment', () => {
  it('returns success true when db update succeeds', async () => {
    const supabase = createMockSupabase({
      data: { id: 'enrollment-1', status: 'cancelled' },
      error: null,
    });
    const result = await rejectEnrollment(supabase, 'enrollment-1');
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// evaluateTrigger — existing customer suppression
// ---------------------------------------------------------------------------

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

function createTableAwareMock(tableResults: Record<string, { data: unknown; error: unknown }>) {
  const makeChain = (tableName: string) => {
    const result = tableResults[tableName] ?? { data: null, error: null };
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'gte', 'in', 'limit', 'order', 'insert', 'update', 'delete'];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.maybeSingle = vi.fn().mockResolvedValue(result);
    chain.single = vi.fn().mockResolvedValue(result);
    chain.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(result));
    return chain;
  };

  return {
    from: vi.fn((table: string) => makeChain(table)),
  } as unknown as SupabaseClient;
}

describe('evaluateTrigger — customer suppression', () => {
  it('skips enrollment when lead matches an existing customer account', async () => {
    const supabase = createTableAwareMock({
      sequences: {
        data: [
          {
            id: 'seq-1',
            trigger_type: 'on_lead_created',
            trigger_conditions: null,
            division_id: null,
          },
        ],
        error: null,
      },
      lead_account_matches: {
        data: { account_id: 'acct-pharmacy', match_type: 'exact_email', match_score: 1.0 },
        error: null,
      },
    });

    const result = await evaluateTrigger(supabase, {
      type: 'on_lead_created',
      lead_id: 'lead-existing-customer',
      data: {},
    });

    expect(result.enrolled).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('enrolls lead when no account match exists', async () => {
    const supabase = createTableAwareMock({
      sequences: {
        data: [
          {
            id: 'seq-1',
            trigger_type: 'on_lead_created',
            trigger_conditions: null,
            division_id: null,
          },
        ],
        error: null,
      },
      lead_account_matches: { data: null, error: null },
      sequence_enrollments: { data: null, error: null },
      sequence_steps: {
        data: { id: 'step-1', step_number: 1, delay_days: 0, delay_hours: 0 },
        error: null,
      },
    });

    const result = await evaluateTrigger(supabase, {
      type: 'on_lead_created',
      lead_id: 'lead-new-prospect',
      data: {},
    });

    expect(result.enrolled).toBe(1);
  });
});
