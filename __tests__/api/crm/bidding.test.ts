import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/org', () => ({ getOrgIdFromAuth: vi.fn() }));
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
import { GET, POST } from '@/app/api/crm/bidding/route';
import { getOrgIdFromAuth } from '@/lib/api/org';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockGetOrgId = vi.mocked(getOrgIdFromAuth);

function mockSupabase(tableResponse: { data: unknown; error: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'ilike',
    'gte',
    'lte',
    'order',
    'range',
    'single',
    'limit',
    'in',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(tableResponse);
  chain.then = (resolve: (v: unknown) => void) =>
    resolve({ ...tableResponse, count: tableResponse.count ?? null });

  const client = {
    from: vi.fn().mockReturnValue(chain),
  };
  mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });
  return client;
}

describe('GET /api/crm/bidding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
    mockGetOrgId.mockResolvedValue('org_test');
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/bidding'));
    expect(res.status).toBe(401);
  });

  it('returns paginated bidding opportunities', async () => {
    const bids = [makeBiddingOpportunity(), makeBiddingOpportunity({ title: 'Second Bid' })];
    mockSupabase({ data: bids, error: null, count: 2 });
    const res = await GET(makeRequest('/api/crm/bidding'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
    expect(json.total).toBe(2);
  });

  it('filters by status', async () => {
    const client = mockSupabase({ data: [], error: null, count: 0 });
    await GET(makeRequest('/api/crm/bidding?status=reviewing'));
    expect(client.from).toHaveBeenCalledWith('bidding_opportunities');
  });

  it('filters by source', async () => {
    mockSupabase({ data: [], error: null, count: 0 });
    const res = await GET(makeRequest('/api/crm/bidding?source=merx'));
    expect(res.status).toBe(200);
  });

  it('filters by search', async () => {
    mockSupabase({ data: [], error: null, count: 0 });
    const res = await GET(makeRequest('/api/crm/bidding?search=municipal'));
    expect(res.status).toBe(200);
  });

  it('handles database errors', async () => {
    mockSupabase({ data: null, error: { message: 'DB error' }, count: null });
    const res = await GET(makeRequest('/api/crm/bidding'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/crm/bidding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
    mockGetOrgId.mockResolvedValue('org_test');
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(makeJsonRequest('/api/crm/bidding', { title: 'Test' }));
    expect(res.status).toBe(401);
  });

  it('creates a bidding opportunity', async () => {
    const bid = makeBiddingOpportunity();
    mockSupabase({ data: bid, error: null });
    const res = await POST(makeJsonRequest('/api/crm/bidding', { title: 'New Bid' }));
    expect(res.status).toBe(201);
  });

  it('validates required title', async () => {
    mockSupabase({ data: null, error: null });
    const res = await POST(makeJsonRequest('/api/crm/bidding', {}));
    expect(res.status).toBe(400);
  });

  it('rejects invalid JSON', async () => {
    const req = makeRequest('/api/crm/bidding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('handles database errors on create', async () => {
    mockSupabase({ data: null, error: { message: 'Insert failed' } });
    const res = await POST(makeJsonRequest('/api/crm/bidding', { title: 'Test' }));
    expect(res.status).toBe(500);
  });
});
