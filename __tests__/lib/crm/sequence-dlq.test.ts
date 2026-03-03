import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkAndMoveToDLQ,
  getDLQEntries,
  retryDLQEntry,
  MAX_RETRIES,
} from '@/lib/crm/sequence-dlq';
import { vi as vitestVi } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockResponse = { data: unknown; error: unknown };

function buildChain(resolveWith: MockResponse) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'ilike',
    'is',
    'or',
    'not',
    'filter',
    'match',
    'order',
    'limit',
    'range',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockImplementation(() => chain);
  }
  chain.single = vi.fn().mockResolvedValue(resolveWith);
  chain.maybeSingle = vi.fn().mockResolvedValue(resolveWith);
  chain.then = (resolve: (v: MockResponse) => void) => resolve(resolveWith);
  return chain;
}

type CallConfig = { enrollment: MockResponse; update: MockResponse };

/**
 * Creates a minimal mock client where:
 * - The first .from('sequence_enrollments').select().eq().single() = enrollment response
 * - Subsequent .from('sequence_enrollments').update()... = update response
 */
function buildStatefulClient(config: CallConfig) {
  let selectCallCount = 0;

  const client = {
    from: vi.fn().mockImplementation((_table: string) => {
      const chain: Record<string, unknown> = {};
      const methods = [
        'select',
        'insert',
        'upsert',
        'delete',
        'eq',
        'neq',
        'gt',
        'gte',
        'lt',
        'lte',
        'in',
        'ilike',
        'is',
        'or',
        'not',
        'filter',
        'match',
        'order',
        'limit',
        'range',
      ];
      for (const m of methods) {
        chain[m] = vi.fn().mockImplementation(() => chain);
      }

      chain.update = vi.fn().mockImplementation(() => buildChain(config.update));
      chain.select = vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return buildChain(config.enrollment);
        }
        // getDLQEntries uses select -> order -> then
        return buildChain(config.update);
      });

      chain.single = vi.fn().mockResolvedValue(config.enrollment);
      chain.maybeSingle = vi.fn().mockResolvedValue(config.enrollment);
      chain.then = (resolve: (v: MockResponse) => void) => resolve(config.enrollment);
      return chain;
    }),
  };

  return client as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MAX_RETRIES', () => {
  it('is 3', () => {
    expect(MAX_RETRIES).toBe(3);
  });
});

describe('checkAndMoveToDLQ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false and increments retry_count when retry_count < MAX_RETRIES (0 retries)', async () => {
    const client = buildStatefulClient({
      enrollment: { data: { retry_count: 0, status: 'active' }, error: null },
      update: { data: {}, error: null },
    });

    const result = await checkAndMoveToDLQ(client, 'enroll-1', 'step-1', 'some error');
    expect(result).toBe(false);
  });

  it('returns false when retry_count is 1 (below threshold)', async () => {
    const client = buildStatefulClient({
      enrollment: { data: { retry_count: 1, status: 'active' }, error: null },
      update: { data: {}, error: null },
    });

    const result = await checkAndMoveToDLQ(client, 'enroll-2', 'step-2', 'another error');
    expect(result).toBe(false);
  });

  it('returns false when retry_count is 2 (one below threshold)', async () => {
    const client = buildStatefulClient({
      enrollment: { data: { retry_count: 2, status: 'active' }, error: null },
      update: { data: {}, error: null },
    });

    const result = await checkAndMoveToDLQ(client, 'enroll-3', 'step-3', 'yet another error');
    expect(result).toBe(false);
  });

  it('returns true and sets status to dead_letter when retry_count >= MAX_RETRIES (exactly 3)', async () => {
    const updateChain = buildChain({ data: {}, error: null });
    const updateMock = vi.fn().mockReturnValue(updateChain);

    const client = {
      from: vi.fn().mockImplementation(() => {
        const chain = buildChain({ data: { retry_count: 3, status: 'active' }, error: null });
        (chain as Record<string, unknown>).update = updateMock;
        return chain;
      }),
    } as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>;

    const result = await checkAndMoveToDLQ(client, 'enroll-4', 'step-4', 'max retries hit');
    expect(result).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'dead_letter' }));
  });

  it('returns true when retry_count exceeds MAX_RETRIES (5 retries)', async () => {
    const updateChain = buildChain({ data: {}, error: null });
    const updateMock = vi.fn().mockReturnValue(updateChain);

    const client = {
      from: vi.fn().mockImplementation(() => {
        const chain = buildChain({ data: { retry_count: 5, status: 'active' }, error: null });
        (chain as Record<string, unknown>).update = updateMock;
        return chain;
      }),
    } as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>;

    const result = await checkAndMoveToDLQ(client, 'enroll-5', 'step-5', 'way over limit');
    expect(result).toBe(true);
  });

  it('moves to DLQ conservatively when enrollment fetch fails', async () => {
    const updateChain = buildChain({ data: {}, error: null });
    const updateMock = vi.fn().mockReturnValue(updateChain);

    const client = {
      from: vi.fn().mockImplementation(() => {
        const chain = buildChain({ data: null, error: { message: 'DB unavailable' } });
        (chain as Record<string, unknown>).update = updateMock;
        return chain;
      }),
    } as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>;

    const result = await checkAndMoveToDLQ(client, 'enroll-6', 'step-6', 'fetch failed');
    expect(result).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'dead_letter' }));
  });

  it('throws when DLQ update itself fails', async () => {
    const updateChain = buildChain({ data: null, error: { message: 'update failed' } });
    const updateMock = vi.fn().mockReturnValue(updateChain);

    const client = {
      from: vi.fn().mockImplementation(() => {
        const chain = buildChain({ data: { retry_count: 3, status: 'active' }, error: null });
        (chain as Record<string, unknown>).update = updateMock;
        return chain;
      }),
    } as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>;

    await expect(
      checkAndMoveToDLQ(client, 'enroll-7', 'step-7', 'trigger dlq update fail'),
    ).rejects.toThrow('Failed to move enrollment enroll-7 to DLQ');
  });
});

describe('getDLQEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped DLQEntry array for dead_letter enrollments', async () => {
    const rawRows = [
      {
        id: 'enroll-a',
        current_step_id: 'step-a',
        retry_count: 3,
        updated_at: '2026-02-27T10:00:00Z',
        metadata: {
          dlq_step_id: 'step-a',
          dlq_error: 'timeout',
          dlq_moved_at: '2026-02-27T10:00:00Z',
        },
      },
    ];

    const client = {
      from: vi.fn().mockImplementation(() => buildChain({ data: rawRows, error: null })),
    } as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>;

    const entries = await getDLQEntries(client);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      enrollment_id: 'enroll-a',
      step_id: 'step-a',
      error_message: 'timeout',
      retry_count: 3,
    });
  });

  it('returns empty array when no dead_letter enrollments exist', async () => {
    const client = {
      from: vi.fn().mockImplementation(() => buildChain({ data: [], error: null })),
    } as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>;

    const entries = await getDLQEntries(client);
    expect(entries).toEqual([]);
  });

  it('throws when query fails', async () => {
    const client = {
      from: vi
        .fn()
        .mockImplementation(() => buildChain({ data: null, error: { message: 'query failed' } })),
    } as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>;

    await expect(getDLQEntries(client)).rejects.toThrow('Failed to fetch DLQ entries');
  });

  it('handles missing metadata fields gracefully (falls back to current_step_id)', async () => {
    const rawRows = [
      {
        id: 'enroll-b',
        current_step_id: 'step-b',
        retry_count: 3,
        updated_at: '2026-02-27T11:00:00Z',
        metadata: null,
      },
    ];

    const client = {
      from: vi.fn().mockImplementation(() => buildChain({ data: rawRows, error: null })),
    } as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>;

    const entries = await getDLQEntries(client);
    expect(entries[0].step_id).toBe('step-b');
    expect(entries[0].error_message).toBe('');
  });
});

describe('retryDLQEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resets status to active and retry_count to 0', async () => {
    const updateChain = buildChain({ data: {}, error: null });
    const updateMock = vi.fn().mockReturnValue(updateChain);

    const client = {
      from: vi.fn().mockImplementation(() => {
        const chain = buildChain({ data: {}, error: null });
        (chain as Record<string, unknown>).update = updateMock;
        return chain;
      }),
    } as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>;

    await expect(retryDLQEntry(client, 'enroll-c')).resolves.toBeUndefined();
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', retry_count: 0 }),
    );
  });

  it('throws when update fails', async () => {
    const updateChain = buildChain({ data: null, error: { message: 'cannot update' } });
    const updateMock = vi.fn().mockReturnValue(updateChain);

    const client = {
      from: vi.fn().mockImplementation(() => {
        const chain = buildChain({ data: null, error: { message: 'cannot update' } });
        (chain as Record<string, unknown>).update = updateMock;
        return chain;
      }),
    } as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>;

    await expect(retryDLQEntry(client, 'enroll-d')).rejects.toThrow(
      'Failed to retry DLQ entry enroll-d',
    );
  });
});
