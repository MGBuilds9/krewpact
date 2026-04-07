import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));

import { auth } from '@clerk/nextjs/server';

import { GET } from '@/app/api/dashboard/route';
import { createUserClientSafe } from '@/lib/supabase/server';

import { makeRequest, mockClerkAuth, mockClerkUnauth } from '../helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

/**
 * Builds a chainable mock where every fluent method is the SAME spy object,
 * so we can introspect the .in() call across the chain. The standard
 * mockSupabaseClient creates a fresh chain on every call, which would lose
 * the spy state we need for this test.
 */
function makeIntrospectableClient() {
  const projectsChain: Record<string, unknown> = {};
  const otherChain: Record<string, unknown> = {};

  function fillChain(chain: Record<string, unknown>, response: unknown) {
    const fluent = [
      'select',
      'eq',
      'neq',
      'gt',
      'gte',
      'lt',
      'lte',
      'in',
      'not',
      'is',
      'or',
      'order',
      'limit',
      'range',
    ];
    for (const m of fluent) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.then = (resolve: (v: unknown) => void) => resolve(response);
  }

  fillChain(projectsChain, { data: [], error: null, count: 3 });
  fillChain(otherChain, { data: [], error: null, count: 0 });

  const client = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'projects') return projectsChain;
      return otherChain;
    }),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  };

  return { client, projectsChain };
}

describe('GET /api/dashboard — activeProjects status filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/dashboard'));
    expect(res.status).toBe(401);
  });

  it('counts active projects across planning, active, and on_hold statuses', async () => {
    const { client, projectsChain } = makeIntrospectableClient();
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const res = await GET(makeRequest('/api/dashboard'));
    expect(res.status).toBe(200);

    // The "Active Projects" tile is intentionally inclusive — anything not yet
    // completed or cancelled counts. Verify the .in() filter was called with
    // the full inclusion set rather than the old narrow .eq('status', 'active').
    expect(projectsChain.in).toHaveBeenCalledWith(
      'status',
      expect.arrayContaining(['planning', 'active', 'on_hold']),
    );

    const body = await res.json();
    expect(body.atAGlance.activeProjects).toBe(3);
  });

  it('still applies division_id filter when provided', async () => {
    const { client, projectsChain } = makeIntrospectableClient();
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const res = await GET(
      makeRequest('/api/dashboard?division_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    );
    expect(res.status).toBe(200);

    expect(projectsChain.eq).toHaveBeenCalledWith(
      'division_id',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    );
  });
});
