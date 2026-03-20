import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DispositionOutcome } from '@/lib/crm/outcome-router';
import { routeOutcome } from '@/lib/crm/outcome-router';

/**
 * Tests for outcome-router.ts — disposition routing for CRM activities.
 * Each outcome maps to specific DB actions (lead status, sequence, follow-up).
 */

const TEST_ACTIVITY_ID = 'act-001';
const TEST_LEAD_ID = 'lead-001';
const TEST_ORG_ID = 'org-001';

function makeActivityData(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_ACTIVITY_ID,
    title: 'Initial call',
    lead_id: TEST_LEAD_ID,
    contact_id: 'contact-001',
    owner_user_id: 'user-001',
    org_id: TEST_ORG_ID,
    ...overrides,
  };
}

function makeLeadData(overrides: Record<string, unknown> = {}) {
  return {
    org_id: TEST_ORG_ID,
    division_id: 'div-001',
    company_name: 'Test Corp',
    assigned_to: 'user-001',
    ...overrides,
  };
}

/**
 * Creates a mock Supabase client for outcome-router tests.
 * Tracks calls to from/update/insert and returns configured responses per table+operation.
 */
function createMockClient(
  config: {
    activity?: Record<string, unknown> | null;
    lead?: Record<string, unknown> | null;
    noAnswerCount?: number;
    enrollmentsToStop?: number;
    createdOpportunity?: { id: string } | null;
    createdFollowUp?: { id: string } | null;
  } = {},
) {
  const calls: { table: string; operation: string; args?: unknown }[] = [];

  const activity = config.activity === null ? null : (config.activity ?? makeActivityData());
  const lead = config.lead ?? makeLeadData();
  const noAnswerCount = config.noAnswerCount ?? 0;
  const enrollmentsToStop = config.enrollmentsToStop ?? 0;
  const createdOpportunity = config.createdOpportunity ?? { id: 'opp-new-1' };
  const createdFollowUp = config.createdFollowUp ?? { id: 'act-followup-1' };

  /** Tracks whether we've already resolved the initial activity fetch */
  let activityFetched = false;

  function createChain(table: string): Record<string, unknown> {
    const chain: Record<string, unknown> = {};

    const methods = ['select', 'eq', 'neq', 'order', 'limit', 'in', 'is', 'not'];
    for (const m of methods) {
      chain[m] = vi.fn().mockImplementation((...args: unknown[]) => {
        // For select with count option (no_answer counting)
        if (
          m === 'select' &&
          typeof args[1] === 'object' &&
          args[1] !== null &&
          'count' in (args[1] as Record<string, unknown>)
        ) {
          calls.push({ table, operation: 'count' });
          return createCountChain(table);
        }
        return chain;
      });
    }

    chain.single = vi.fn().mockImplementation(() => {
      if (table === 'activities' && !activityFetched) {
        activityFetched = true;
        return Promise.resolve({
          data: activity,
          error: activity ? null : { code: 'PGRST116', message: 'Not found' },
        });
      }
      if (table === 'leads') {
        return Promise.resolve({ data: lead, error: null });
      }
      if (table === 'opportunities') {
        return Promise.resolve({ data: createdOpportunity, error: null });
      }
      // Follow-up activity inserts
      if (table === 'activities') {
        return Promise.resolve({ data: createdFollowUp, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    chain.update = vi.fn().mockImplementation((data: unknown) => {
      calls.push({ table, operation: 'update', args: data });
      return createUpdateChain(table);
    });

    chain.insert = vi.fn().mockImplementation((data: unknown) => {
      calls.push({ table, operation: 'insert', args: data });
      return createInsertChain(table);
    });

    return chain;
  }

  function createUpdateChain(table: string): Record<string, unknown> {
    const chain: Record<string, unknown> = {};
    const methods = ['eq', 'neq', 'is', 'not'];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.select = vi.fn().mockImplementation(() => {
      if (table === 'sequence_enrollments') {
        const data =
          enrollmentsToStop > 0
            ? Array.from({ length: enrollmentsToStop }, (_, i) => ({ id: `enroll-${i}` }))
            : [];
        return Promise.resolve({ data, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
    // Also resolve as a promise for non-select update chains
    chain.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
    return chain;
  }

  function createInsertChain(table: string): Record<string, unknown> {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue({
      single: vi.fn().mockImplementation(() => {
        if (table === 'opportunities') {
          return Promise.resolve({ data: createdOpportunity, error: null });
        }
        if (table === 'activities') {
          return Promise.resolve({ data: createdFollowUp, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    });
    return chain;
  }

  function createCountChain(table: string): Record<string, unknown> {
    const chain: Record<string, unknown> = {};
    const methods = ['eq', 'neq', 'is', 'not'];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    // Resolve as a thenable with count
    chain.then = (resolve: (v: unknown) => void) => {
      if (table === 'activities') {
        resolve({ count: noAnswerCount, error: null });
      } else {
        resolve({ count: 0, error: null });
      }
    };
    return chain;
  }

  const client = {
    from: vi.fn().mockImplementation((table: string) => {
      calls.push({ table, operation: 'from' });
      return createChain(table);
    }),
  };

  return {
    client: client as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>,
    calls,
  };
}

describe('routeOutcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // interested
  // ============================================================
  describe('interested outcome', () => {
    it('updates activity, qualifies lead, stops sequences, creates opportunity', async () => {
      const { client } = createMockClient({ enrollmentsToStop: 1 });

      const result = await routeOutcome(client, TEST_ACTIVITY_ID, 'interested');

      expect(result.activityUpdated).toBe(true);
      expect(result.leadStatusChanged).toBe('qualified');
      expect(result.sequenceStopped).toBe(true);
      expect(result.opportunityCreated).toBe(true);
      expect(result.opportunityId).toBe('opp-new-1');
    });

    it('skips lead actions when activity has no lead_id', async () => {
      const { client } = createMockClient({
        activity: makeActivityData({ lead_id: null }),
      });

      const result = await routeOutcome(client, TEST_ACTIVITY_ID, 'interested');

      expect(result.activityUpdated).toBe(true);
      expect(result.leadStatusChanged).toBeUndefined();
      expect(result.sequenceStopped).toBeUndefined();
      expect(result.opportunityCreated).toBeUndefined();
    });

    it('reports sequenceStopped=false when no active enrollments exist', async () => {
      const { client } = createMockClient({ enrollmentsToStop: 0 });

      const result = await routeOutcome(client, TEST_ACTIVITY_ID, 'interested');

      expect(result.sequenceStopped).toBe(false);
    });
  });

  // ============================================================
  // follow_up
  // ============================================================
  describe('follow_up outcome', () => {
    it('creates follow-up task with default 3-day delay', async () => {
      const { client } = createMockClient();

      const result = await routeOutcome(client, TEST_ACTIVITY_ID, 'follow_up');

      expect(result.activityUpdated).toBe(true);
      expect(result.followUpCreated).toBe(true);
      expect(result.followUpActivityId).toBe('act-followup-1');
      // Lead status should not change on follow_up
      expect(result.leadStatusChanged).toBeUndefined();
      expect(result.sequenceStopped).toBeUndefined();
    });

    it('accepts custom followUpDays', async () => {
      const { client, calls } = createMockClient();

      await routeOutcome(client, TEST_ACTIVITY_ID, 'follow_up', {
        followUpDays: 7,
      });

      // Verify the insert call was made to activities
      const insertCall = calls.find((c) => c.table === 'activities' && c.operation === 'insert');
      expect(insertCall).toBeDefined();
      const insertData = insertCall?.args as Record<string, unknown>;
      expect(insertData.title).toBe('Follow up: Initial call');
    });

    it('includes notes in follow-up details', async () => {
      const { client, calls } = createMockClient();

      await routeOutcome(client, TEST_ACTIVITY_ID, 'follow_up', {
        notes: 'Call back after lunch',
      });

      const insertCall = calls.find((c) => c.table === 'activities' && c.operation === 'insert');
      const insertData = insertCall?.args as Record<string, unknown>;
      expect(insertData.details).toBe('Call back after lunch');
    });
  });

  // ============================================================
  // not_interested
  // ============================================================
  describe('not_interested outcome', () => {
    it('marks lead as lost and stops sequences', async () => {
      const { client } = createMockClient({ enrollmentsToStop: 2 });

      const result = await routeOutcome(client, TEST_ACTIVITY_ID, 'not_interested');

      expect(result.activityUpdated).toBe(true);
      expect(result.leadStatusChanged).toBe('lost');
      expect(result.sequenceStopped).toBe(true);
    });

    it('skips lead actions when activity has no lead_id', async () => {
      const { client } = createMockClient({
        activity: makeActivityData({ lead_id: null }),
      });

      const result = await routeOutcome(client, TEST_ACTIVITY_ID, 'not_interested');

      expect(result.activityUpdated).toBe(true);
      expect(result.leadStatusChanged).toBeUndefined();
    });
  });

  // ============================================================
  // no_answer
  // ============================================================
  describe('no_answer outcome', () => {
    it('creates retry task when under 3 attempts', async () => {
      const { client } = createMockClient({ noAnswerCount: 1 });

      const result = await routeOutcome(client, TEST_ACTIVITY_ID, 'no_answer');

      expect(result.activityUpdated).toBe(true);
      expect(result.followUpCreated).toBe(true);
      expect(result.followUpActivityId).toBe('act-followup-1');
      expect(result.leadStatusChanged).toBeUndefined();
    });

    it('marks lead as cold/lost after 3 no-answer attempts', async () => {
      const { client } = createMockClient({
        noAnswerCount: 3,
        enrollmentsToStop: 1,
      });

      const result = await routeOutcome(client, TEST_ACTIVITY_ID, 'no_answer');

      expect(result.activityUpdated).toBe(true);
      expect(result.leadStatusChanged).toBe('lost');
      expect(result.sequenceStopped).toBe(true);
      expect(result.followUpCreated).toBeUndefined();
    });

    it('skips lead actions when activity has no lead_id', async () => {
      const { client } = createMockClient({
        activity: makeActivityData({ lead_id: null }),
      });

      const result = await routeOutcome(client, TEST_ACTIVITY_ID, 'no_answer');

      expect(result.activityUpdated).toBe(true);
      expect(result.leadStatusChanged).toBeUndefined();
      expect(result.followUpCreated).toBeUndefined();
    });
  });

  // ============================================================
  // error handling
  // ============================================================
  describe('error handling', () => {
    it('throws when activity is not found', async () => {
      const { client } = createMockClient({ activity: null });

      await expect(routeOutcome(client, 'nonexistent', 'interested')).rejects.toThrow(
        'Activity not found',
      );
    });
  });

  // ============================================================
  // all outcome types
  // ============================================================
  describe('all outcomes update the activity', () => {
    const outcomes: DispositionOutcome[] = [
      'interested',
      'follow_up',
      'not_interested',
      'no_answer',
    ];

    for (const outcome of outcomes) {
      it(`marks activity completed for outcome: ${outcome}`, async () => {
        const { client, calls } = createMockClient();

        const result = await routeOutcome(client, TEST_ACTIVITY_ID, outcome);

        expect(result.activityUpdated).toBe(true);
        // Verify update was called on activities table
        const updateCall = calls.find((c) => c.table === 'activities' && c.operation === 'update');
        expect(updateCall).toBeDefined();
        const updateData = updateCall?.args as Record<string, unknown>;
        expect(updateData.outcome).toBe(outcome);
        expect(updateData.completed_at).toBeDefined();
      });
    }
  });
});
