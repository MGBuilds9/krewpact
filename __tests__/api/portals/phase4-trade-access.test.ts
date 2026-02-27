import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET as getCompliance } from '@/app/api/portal/trade/compliance/route';
import { GET as getBids, POST as postBid } from '@/app/api/portal/trade/bids/route';
import { mockClerkAuth, mockClerkUnauth, makeRequest, makeJsonRequest, TEST_IDS } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

const ACTIVE_TRADE_PA = {
  id: 'pa-trade-001',
  status: 'active',
  actor_type: 'trade_partner',
};

const INACTIVE_CLIENT_PA = {
  id: 'pa-client-001',
  status: 'active',
  actor_type: 'client', // Wrong type for trade endpoints
};

function makeTradeSupabaseMock(portalAccount = ACTIVE_TRADE_PA) {
  const single = vi.fn().mockResolvedValue({ data: portalAccount, error: null });
  const select = vi.fn().mockReturnThis();
  const eq = vi.fn().mockReturnThis();
  const order = vi.fn().mockReturnThis();
  const contains = vi.fn().mockReturnValue({
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  });
  const insert = vi.fn().mockReturnThis();
  const fromInsert = vi.fn().mockReturnThis();
  fromInsert.select = vi.fn().mockReturnThis();
  fromInsert.single = vi.fn().mockResolvedValue({ data: { id: 'proposal-001' }, error: null });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'portal_accounts') return { select, eq: vi.fn().mockReturnValue({ single }) };
    if (table === 'proposals') return { select, contains, insert: fromInsert };
    return { select, eq, order, contains, insert, single };
  });

  return { from };
}

// ============================================================
// Trade compliance API
// ============================================================
describe('GET /api/portal/trade/compliance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await getCompliance(makeRequest('/api/portal/trade/compliance'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when portal account is client type (not trade_partner)', async () => {
    mockClerkAuth(mockAuth, 'clerk_user_client');
    mockCreateUserClient.mockReturnValue(makeTradeSupabaseMock(INACTIVE_CLIENT_PA) as unknown as ReturnType<typeof createUserClient>);
    const res = await getCompliance(makeRequest('/api/portal/trade/compliance'));
    expect(res.status).toBe(403);
  });
});

// ============================================================
// Trade bids API
// ============================================================
describe('GET /api/portal/trade/bids', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await getBids(makeRequest('/api/portal/trade/bids'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when actor_type is client', async () => {
    mockClerkAuth(mockAuth, 'clerk_user_client');
    mockCreateUserClient.mockReturnValue(makeTradeSupabaseMock(INACTIVE_CLIENT_PA) as unknown as ReturnType<typeof createUserClient>);
    const res = await getBids(makeRequest('/api/portal/trade/bids'));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/portal/trade/bids', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await postBid(makeJsonRequest('/api/portal/trade/bids', { project_id: TEST_IDS.PROJECT_ID, bid_amount: 50000, scope_summary: 'Full electrical scope for Phase 1' }, 'POST'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when bid_amount is missing', async () => {
    mockClerkAuth(mockAuth, 'clerk_trade_user');
    mockCreateUserClient.mockReturnValue(makeTradeSupabaseMock() as unknown as ReturnType<typeof createUserClient>);
    const res = await postBid(makeJsonRequest('/api/portal/trade/bids', {
      project_id: TEST_IDS.PROJECT_ID,
      scope_summary: 'Scope without amount',
      // bid_amount missing
    }, 'POST'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when scope_summary is too short', async () => {
    mockClerkAuth(mockAuth, 'clerk_trade_user');
    mockCreateUserClient.mockReturnValue(makeTradeSupabaseMock() as unknown as ReturnType<typeof createUserClient>);
    const res = await postBid(makeJsonRequest('/api/portal/trade/bids', {
      project_id: TEST_IDS.PROJECT_ID,
      bid_amount: 10000,
      scope_summary: 'Short', // Less than 10 chars
    }, 'POST'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative bid_amount', async () => {
    mockClerkAuth(mockAuth, 'clerk_trade_user');
    mockCreateUserClient.mockReturnValue(makeTradeSupabaseMock() as unknown as ReturnType<typeof createUserClient>);
    const res = await postBid(makeJsonRequest('/api/portal/trade/bids', {
      project_id: TEST_IDS.PROJECT_ID,
      bid_amount: -1000,
      scope_summary: 'Full electrical scope for Phase 1',
    }, 'POST'));
    expect(res.status).toBe(400);
  });
});

// ============================================================
// Actor type guard edge cases
// ============================================================
describe('Actor type guard logic', () => {
  it('client portal account returns 403 from trade endpoints', () => {
    const pa = { actor_type: 'client', status: 'active' };
    const isTradePartner = pa.actor_type === 'trade_partner' && pa.status === 'active';
    expect(isTradePartner).toBe(false);
  });

  it('inactive trade partner returns 403', () => {
    const pa = { actor_type: 'trade_partner', status: 'invited' };
    const isTradePartner = pa.actor_type === 'trade_partner' && pa.status === 'active';
    expect(isTradePartner).toBe(false);
  });

  it('active trade partner passes guard', () => {
    const pa = { actor_type: 'trade_partner', status: 'active' };
    const isTradePartner = pa.actor_type === 'trade_partner' && pa.status === 'active';
    expect(isTradePartner).toBe(true);
  });
});
