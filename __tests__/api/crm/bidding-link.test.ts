import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/crm/bidding/[id]/link/route';
import { mockClerkAuth, mockClerkUnauth, makeJsonRequest, makeRequest, makeBiddingOpportunity } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

const OPP_ID = '00000000-0000-4000-a000-000000000040';
const ctx = { params: Promise.resolve({ id: '00000000-0000-4000-a000-000000000001' }) };

function mockSupabase(oppExists: boolean) {
  const bid = makeBiddingOpportunity({ opportunity_id: OPP_ID });
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'order', 'range', 'limit'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }

  let singleCallCount = 0;
  chain.single = vi.fn().mockImplementation(() => {
    singleCallCount++;
    if (singleCallCount === 1) {
      return Promise.resolve(
        oppExists
          ? { data: { id: OPP_ID }, error: null }
          : { data: null, error: { code: 'PGRST116', message: 'Not found' } },
      );
    }
    return Promise.resolve({ data: bid, error: null });
  });

  const client = {
    from: vi.fn().mockReturnValue(chain),
  };
  mockCreateUserClient.mockResolvedValue(client as never);
  return client;
}

describe('POST /api/crm/bidding/[id]/link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/bidding/123/link', { opportunity_id: OPP_ID }),
      ctx,
    );
    expect(res.status).toBe(401);
  });

  it('links bidding to opportunity', async () => {
    mockSupabase(true);
    const res = await POST(
      makeJsonRequest('/api/crm/bidding/123/link', { opportunity_id: OPP_ID }),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it('returns 404 when opportunity not found', async () => {
    mockSupabase(false);
    const res = await POST(
      makeJsonRequest('/api/crm/bidding/123/link', { opportunity_id: OPP_ID }),
      ctx,
    );
    expect(res.status).toBe(404);
  });

  it('validates opportunity_id is a UUID', async () => {
    mockSupabase(true);
    const res = await POST(
      makeJsonRequest('/api/crm/bidding/123/link', { opportunity_id: 'not-a-uuid' }),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it('rejects invalid JSON', async () => {
    const req = makeRequest('/api/crm/bidding/123/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'bad',
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });
});
