import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));

import { auth } from '@clerk/nextjs/server';

import { GET } from '@/app/api/crm/opportunities/route';
import { createUserClientSafe } from '@/lib/supabase/server';

import { makeOpportunity, makeRequest, mockClerkAuth } from '../../helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

/**
 * Builds a single-instance chainable mock where every fluent method returns
 * the SAME chain object. This lets us track whether `.range()` was called
 * across the full chain (the standard mockSupabaseClient creates a fresh
 * chain on every method call, which would lose the spy).
 */
function makeTrackingClient(data: unknown) {
  const chain: Record<string, unknown> = {};
  const fluentMethods = [
    'select',
    'insert',
    'update',
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
    'contains',
    'containedBy',
    'filter',
    'match',
    'order',
    'limit',
    'range',
  ];
  for (const m of fluentMethods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({ data, error: null });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  chain.then = (resolve: (v: { data: unknown; error: null; count: number }) => void) =>
    resolve({
      data,
      error: null,
      count: Array.isArray(data) ? data.length : 0,
    });

  const client = {
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  };

  return { client, chain };
}

describe('GET /api/crm/opportunities — ISSUE-016 pipeline pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
  });

  it('does NOT call .range() when view=pipeline', async () => {
    // 50 opportunities — more than the default page size — to make the
    // regression visible: with the old code, kanban totals would silently
    // top out at the limit, so we make sure ALL data flows through.
    const opps = Array.from({ length: 50 }, (_, i) =>
      makeOpportunity({ stage: i % 2 === 0 ? 'intake' : 'proposal', estimated_revenue: 10000 }),
    );
    const { client, chain } = makeTrackingClient(opps);
    mockCreateUserClientSafe.mockResolvedValue({
      client: client as never,
      error: null,
    });

    const res = await GET(makeRequest('/api/crm/opportunities?view=pipeline'));
    expect(res.status).toBe(200);

    // The critical assertion: pagination is bypassed in pipeline mode.
    expect(chain.range).not.toHaveBeenCalled();

    const body = await res.json();
    expect(body.stages).toBeDefined();
    // All 50 opportunities accounted for across the stages.
    const totalCount = Object.values(body.stages as Record<string, { count: number }>).reduce(
      (sum, s) => sum + s.count,
      0,
    );
    expect(totalCount).toBe(50);
  });

  it('still calls .range() for the default list view', async () => {
    const opps = [makeOpportunity()];
    const { client, chain } = makeTrackingClient(opps);
    mockCreateUserClientSafe.mockResolvedValue({
      client: client as never,
      error: null,
    });

    const res = await GET(makeRequest('/api/crm/opportunities'));
    expect(res.status).toBe(200);

    // List view applies pagination as before.
    expect(chain.range).toHaveBeenCalledTimes(1);
  });

  it('still calls .range() when view=list is explicit', async () => {
    const opps = [makeOpportunity()];
    const { client, chain } = makeTrackingClient(opps);
    mockCreateUserClientSafe.mockResolvedValue({
      client: client as never,
      error: null,
    });

    const res = await GET(makeRequest('/api/crm/opportunities?view=list'));
    expect(res.status).toBe(200);

    expect(chain.range).toHaveBeenCalledTimes(1);
  });
});
