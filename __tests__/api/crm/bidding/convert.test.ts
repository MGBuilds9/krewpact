import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

import { auth } from '@clerk/nextjs/server';

import {
  makeBiddingOpportunity,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
} from '@/__tests__/helpers';
import { POST } from '@/app/api/crm/bidding/[id]/convert/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const BID_ID = '00000000-0000-4000-a000-000000000001';
const OPP_ID = '00000000-0000-4000-a000-000000000099';
const ctx = { params: Promise.resolve({ id: BID_ID }) };

function buildChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'update', 'eq', 'order', 'range'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  Object.assign(chain, overrides);
  return chain;
}

function mockSupabase({
  bidExists = true,
  alreadyLinked = false,
  insertOppFails = false,
}: {
  bidExists?: boolean;
  alreadyLinked?: boolean;
  insertOppFails?: boolean;
} = {}) {
  const bid = makeBiddingOpportunity({
    id: BID_ID,
    opportunity_id: alreadyLinked ? OPP_ID : null,
  });

  const bidChain = buildChain();

  (bidChain.single as any) = vi
    .fn()
    .mockResolvedValue(
      bidExists
        ? { data: bid, error: null }
        : { data: null, error: { code: 'PGRST116', message: 'Not found' } },
    );
  bidChain.eq = vi.fn().mockReturnValue(bidChain);
  bidChain.select = vi.fn().mockReturnValue(bidChain);

  const oppChain = buildChain();

  (oppChain.single as any) = vi
    .fn()
    .mockResolvedValue(
      insertOppFails
        ? { data: null, error: { message: 'DB error' } }
        : { data: { id: OPP_ID }, error: null },
    );
  oppChain.insert = vi.fn().mockReturnValue(oppChain);
  oppChain.select = vi.fn().mockReturnValue(oppChain);

  const updateChain = buildChain();
  updateChain.eq = vi.fn().mockResolvedValue({ error: null });

  const client = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'bidding_opportunities') return bidChain;
      if (table === 'opportunities') return oppChain;
      return updateChain;
    }),
  };

  // Second call to bidding_opportunities is the update
  let biddingCallCount = 0;
  client.from = vi.fn().mockImplementation((table: string) => {
    if (table === 'bidding_opportunities') {
      biddingCallCount++;
      if (biddingCallCount === 1) return bidChain;
      return updateChain;
    }
    return oppChain;
  });

  mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });
  return client;
}

describe('POST /api/crm/bidding/[id]/convert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeRequest(`/api/crm/bidding/${BID_ID}/convert`, { method: 'POST' }),
      ctx,
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when bid does not exist', async () => {
    mockSupabase({ bidExists: false });
    const res = await POST(
      makeRequest(`/api/crm/bidding/${BID_ID}/convert`, { method: 'POST' }),
      ctx,
    );
    expect(res.status).toBe(404);
  });

  it('returns 409 when bid is already linked to an opportunity', async () => {
    mockSupabase({ alreadyLinked: true });
    const res = await POST(
      makeRequest(`/api/crm/bidding/${BID_ID}/convert`, { method: 'POST' }),
      ctx,
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { opportunity_id: string };
    expect(body.opportunity_id).toBe(OPP_ID);
  });

  it('creates opportunity and returns 201 with opportunity_id', async () => {
    mockSupabase();
    const res = await POST(
      makeRequest(`/api/crm/bidding/${BID_ID}/convert`, { method: 'POST' }),
      ctx,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { opportunity_id: string };
    expect(body.opportunity_id).toBe(OPP_ID);
  });

  it('returns 500 when opportunity insert fails', async () => {
    mockSupabase({ insertOppFails: true });
    const res = await POST(
      makeRequest(`/api/crm/bidding/${BID_ID}/convert`, { method: 'POST' }),
      ctx,
    );
    expect(res.status).toBe(500);
  });
});
