import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
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
import { DELETE, GET, PATCH } from '@/app/api/crm/bidding/[id]/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function mockSupabase(tableResponse: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'order',
    'range',
    'limit',
    'in',
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(tableResponse);
  chain.then = (resolve: (v: unknown) => void) => resolve(tableResponse);

  const client = {
    from: vi.fn().mockReturnValue(chain),
  };
  mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });
  return client;
}

const ctx = { params: Promise.resolve({ id: '00000000-0000-4000-a000-000000000001' }) };

describe('GET /api/crm/bidding/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/bidding/123'), ctx);
    expect(res.status).toBe(401);
  });

  it('returns a bidding opportunity', async () => {
    const bid = makeBiddingOpportunity();
    mockSupabase({ data: bid, error: null });
    const res = await GET(makeRequest('/api/crm/bidding/123'), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.title).toBe('Municipal Building Renovation Bid');
  });

  it('returns 404 when not found', async () => {
    mockSupabase({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    const res = await GET(makeRequest('/api/crm/bidding/missing'), ctx);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/crm/bidding/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
  });

  it('updates a bidding opportunity', async () => {
    const updated = makeBiddingOpportunity({ status: 'reviewing' });
    mockSupabase({ data: updated, error: null });
    const res = await PATCH(
      makeJsonRequest('/api/crm/bidding/123', { status: 'reviewing' }, 'PATCH'),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it('rejects invalid JSON', async () => {
    const req = makeRequest('/api/crm/bidding/123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it('returns 404 when not found', async () => {
    mockSupabase({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    const res = await PATCH(
      makeJsonRequest('/api/crm/bidding/123', { title: 'Updated' }, 'PATCH'),
      ctx,
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/crm/bidding/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
  });

  it('deletes a bidding opportunity', async () => {
    mockSupabase({ data: null, error: null });
    const res = await DELETE(makeRequest('/api/crm/bidding/123', { method: 'DELETE' }), ctx);
    expect(res.status).toBe(200);
  });

  it('handles delete errors', async () => {
    mockSupabase({ data: null, error: { message: 'Delete failed' } });
    const res = await DELETE(makeRequest('/api/crm/bidding/123', { method: 'DELETE' }), ctx);
    expect(res.status).toBe(500);
  });
});
