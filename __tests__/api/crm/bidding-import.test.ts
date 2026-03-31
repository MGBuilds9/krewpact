import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/org', () => ({ getKrewpactOrgId: vi.fn().mockResolvedValue('test-org-00000000-0000-0000-0000-000000000000') }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeBiddingOpportunity,
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
} from '@/__tests__/helpers';
import { POST } from '@/app/api/crm/bidding/import/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function mockSupabase(resp: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'range', 'limit'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(resp);

  const client = {
    from: vi.fn().mockReturnValue(chain),
  };
  mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });
  return client;
}

describe('POST /api/crm/bidding/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/bidding/import', {
        items: [{ title: 'Test' }],
      }),
    );
    expect(res.status).toBe(401);
  });

  it('imports bidding opportunities', async () => {
    const bids = [makeBiddingOpportunity(), makeBiddingOpportunity({ title: 'Second' })];
    mockSupabase({ data: bids, error: null });
    const res = await POST(
      makeJsonRequest('/api/crm/bidding/import', {
        items: [
          { title: 'Bid 1', source: 'merx' },
          { title: 'Bid 2', source: 'merx' },
        ],
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.imported).toBe(2);
  });

  it('validates items array is required', async () => {
    mockSupabase({ data: null, error: null });
    const res = await POST(makeJsonRequest('/api/crm/bidding/import', {}));
    expect(res.status).toBe(400);
  });

  it('validates items must have title', async () => {
    mockSupabase({ data: null, error: null });
    const res = await POST(
      makeJsonRequest('/api/crm/bidding/import', {
        items: [{ source: 'merx' }],
      }),
    );
    expect(res.status).toBe(400);
  });

  it('handles database errors', async () => {
    mockSupabase({ data: null, error: { message: 'Insert failed' } });
    const res = await POST(
      makeJsonRequest('/api/crm/bidding/import', {
        items: [{ title: 'Test' }],
      }),
    );
    expect(res.status).toBe(500);
  });

  it('rejects invalid JSON', async () => {
    const req = makeRequest('/api/crm/bidding/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'bad',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
