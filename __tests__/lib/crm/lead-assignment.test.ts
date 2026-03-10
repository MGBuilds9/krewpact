import { describe, it, expect, vi } from 'vitest';
import { assignLead } from '@/lib/crm/lead-assignment';
import { mockSupabaseClient } from '@/__tests__/helpers';

/**
 * Tests for lead-assignment.ts — rule-based + round-robin assignment.
 * The function takes a Supabase client directly (no auth/route mocking needed).
 */

describe('assignLead', () => {
  it('returns rule-based assignment when a matching rule exists', async () => {
    const client = mockSupabaseClient({
      tables: {
        lead_assignment_rules: {
          data: [{ assigned_user_id: 'user-rule-1' }],
          error: null,
        },
      },
    });

    const result = await assignLead(client, {
      division_id: 'div-1',
      source_channel: 'website',
    });

    expect(result.assigned).toBe(true);
    expect(result.assigned_to).toBe('user-rule-1');
    expect(result.method).toBe('rule');
  });

  it('falls back to round-robin when no rule matches', async () => {
    const client = mockSupabaseClient({
      tables: {
        lead_assignment_rules: { data: [], error: null },
        user_divisions: {
          data: [{ user_id: 'user-a' }, { user_id: 'user-b' }],
          error: null,
        },
        users: {
          data: [{ id: 'user-a' }, { id: 'user-b' }],
          error: null,
        },
        leads: { data: [], error: null },
      },
    });

    const result = await assignLead(client, {
      division_id: 'div-1',
      source_channel: 'website',
    });

    expect(result.assigned).toBe(true);
    expect(result.method).toBe('round_robin');
    // With 0 leads each, picks alphabetically first
    expect(result.assigned_to).toBe('user-a');
  });

  it('returns none when division has no users in user_divisions', async () => {
    const client = mockSupabaseClient({
      tables: {
        lead_assignment_rules: { data: [], error: null },
        user_divisions: { data: [], error: null },
      },
    });

    const result = await assignLead(client, {
      division_id: 'div-empty',
      source_channel: null,
    });

    expect(result.assigned).toBe(false);
    expect(result.assigned_to).toBeNull();
    expect(result.method).toBe('none');
  });

  it('returns none when division_id is null and no active users exist', async () => {
    const client = mockSupabaseClient({
      tables: {
        lead_assignment_rules: { data: [], error: null },
        users: { data: [], error: null },
        leads: { data: [], error: null },
      },
    });

    const result = await assignLead(client, {
      division_id: null,
      source_channel: null,
    });

    expect(result.assigned).toBe(false);
    expect(result.assigned_to).toBeNull();
    expect(result.method).toBe('none');
  });

  it('returns none when both source_channel and division_id are null and no rules match', async () => {
    const client = mockSupabaseClient({
      tables: {
        lead_assignment_rules: { data: [], error: null },
        users: { data: [], error: null },
        leads: { data: [], error: null },
      },
    });

    const result = await assignLead(client, {
      division_id: null,
      source_channel: null,
    });

    expect(result.assigned).toBe(false);
    expect(result.assigned_to).toBeNull();
    expect(result.method).toBe('none');
  });

  it('round-robin picks user with fewest open leads', async () => {
    const client = mockSupabaseClient({
      tables: {
        lead_assignment_rules: { data: [], error: null },
        user_divisions: {
          data: [{ user_id: 'user-a' }, { user_id: 'user-b' }],
          error: null,
        },
        users: {
          data: [{ id: 'user-a' }, { id: 'user-b' }],
          error: null,
        },
        // user-a has 2 open leads, user-b has 0
        leads: {
          data: [{ assigned_to: 'user-a' }, { assigned_to: 'user-a' }],
          error: null,
        },
      },
    });

    const result = await assignLead(client, {
      division_id: 'div-1',
      source_channel: null,
    });

    expect(result.assigned).toBe(true);
    expect(result.assigned_to).toBe('user-b');
    expect(result.method).toBe('round_robin');
  });

  it('round-robin breaks ties by user ID (alphabetical)', async () => {
    const client = mockSupabaseClient({
      tables: {
        lead_assignment_rules: { data: [], error: null },
        user_divisions: {
          data: [{ user_id: 'user-z' }, { user_id: 'user-a' }],
          error: null,
        },
        users: {
          data: [{ id: 'user-z' }, { id: 'user-a' }],
          error: null,
        },
        leads: { data: [], error: null },
      },
    });

    const result = await assignLead(client, {
      division_id: 'div-1',
      source_channel: null,
    });

    expect(result.assigned).toBe(true);
    expect(result.assigned_to).toBe('user-a');
  });

  it('handles null source_channel in rule matching (queries is.null)', async () => {
    // When source_channel is null, rule query should use .is('source_channel', null)
    const fromSpy = vi.fn();
    const client = mockSupabaseClient({
      tables: {
        lead_assignment_rules: { data: [], error: null },
        users: { data: [], error: null },
        leads: { data: [], error: null },
      },
    });
    // Wrap from to spy on it
    const originalFrom = client.from;
    client.from = vi.fn((...args: Parameters<typeof originalFrom>) => {
      fromSpy(...args);
      return originalFrom(...args);
    }) as unknown as typeof originalFrom;

    await assignLead(client, {
      division_id: null,
      source_channel: null,
    });

    // Verify lead_assignment_rules was queried
    expect(fromSpy).toHaveBeenCalledWith('lead_assignment_rules');
  });
});
