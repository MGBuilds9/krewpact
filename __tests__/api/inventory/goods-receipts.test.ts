vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn(),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: vi.fn(),
}));
vi.mock('@/lib/inventory/goods-receipts', () => ({
  createGoodsReceipt: vi.fn(),
  listGoodsReceipts: vi.fn(),
  getGoodsReceipt: vi.fn(),
  confirmGoodsReceipt: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeJsonRequest, makeRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { POST as POST_CONFIRM } from '@/app/api/inventory/goods-receipts/[id]/confirm/route';
import { GET as GET_BY_ID } from '@/app/api/inventory/goods-receipts/[id]/route';
import { GET, POST } from '@/app/api/inventory/goods-receipts/route';
import { rateLimit } from '@/lib/api/rate-limit';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  confirmGoodsReceipt,
  createGoodsReceipt,
  getGoodsReceipt,
  listGoodsReceipts,
} from '@/lib/inventory/goods-receipts';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateClient = vi.mocked(createUserClientSafe);
const mockRateLimit = vi.mocked(rateLimit);
const mockFeatureEnabled = vi.mocked(isFeatureEnabled);
const mockCreateGR = vi.mocked(createGoodsReceipt);
const mockListGRs = vi.mocked(listGoodsReceipts);
const mockGetGR = vi.mocked(getGoodsReceipt);
const mockConfirmGR = vi.mocked(confirmGoodsReceipt);

const fakeSb = {} as never;

const validGRBody = {
  po_id: 'a0000000-0000-4000-8000-000000000001',
  division_id: 'b0000000-0000-4000-8000-000000000002',
  location_id: 'c0000000-0000-4000-8000-000000000003',
  lines: [
    {
      po_line_id: 'e0000000-0000-4000-8000-000000000010',
      item_id: 'd0000000-0000-4000-8000-000000000004',
      qty_received: 50,
      unit_price: 2.5,
    },
  ],
};

describe('GET /api/inventory/goods-receipts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user-1');
    mockFeatureEnabled.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true, remaining: 60, reset: 0 });
    mockCreateClient.mockResolvedValue({ client: fakeSb, error: null } as never);
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/inventory/goods-receipts'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when feature disabled', async () => {
    mockFeatureEnabled.mockReturnValue(false);
    const res = await GET(makeRequest('/api/inventory/goods-receipts'));
    expect(res.status).toBe(404);
  });

  it('returns list with filters', async () => {
    const grList = { data: [{ id: 'gr-1', gr_number: 'GR-2026-0001' }], total: 1 };
    mockListGRs.mockResolvedValue(grList as never);

    const res = await GET(makeRequest('/api/inventory/goods-receipts?po_id=po-1&status=draft'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(mockListGRs).toHaveBeenCalledWith(
      fakeSb,
      expect.objectContaining({ poId: 'po-1', status: 'draft' }),
    );
  });
});

describe('POST /api/inventory/goods-receipts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user-1');
    mockFeatureEnabled.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true, remaining: 60, reset: 0 });
    mockCreateClient.mockResolvedValue({ client: fakeSb, error: null } as never);
  });

  it('creates GR with lines', async () => {
    const createdGR = { id: 'gr-1', gr_number: 'GR-2026-0001', lines: [] };
    mockCreateGR.mockResolvedValue(createdGR as never);

    const res = await POST(makeJsonRequest('/api/inventory/goods-receipts', validGRBody));
    expect(res.status).toBe(201);
    expect(mockCreateGR).toHaveBeenCalledWith(
      fakeSb,
      expect.objectContaining({
        po_id: validGRBody.po_id,
        received_by: 'user-1',
        created_by: 'user-1',
        lines: validGRBody.lines,
      }),
    );
  });

  it('returns 400 on empty lines', async () => {
    const res = await POST(
      makeJsonRequest('/api/inventory/goods-receipts', {
        ...validGRBody,
        lines: [],
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/inventory/goods-receipts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user-1');
    mockFeatureEnabled.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true, remaining: 60, reset: 0 });
    mockCreateClient.mockResolvedValue({ client: fakeSb, error: null } as never);
  });

  it('returns GR with lines', async () => {
    const gr = { id: 'gr-1', gr_number: 'GR-2026-0001', lines: [{ id: 'line-1' }] };
    mockGetGR.mockResolvedValue(gr as never);

    const res = await GET_BY_ID(makeRequest('/api/inventory/goods-receipts/gr-1'), {
      params: Promise.resolve({ id: 'gr-1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lines).toHaveLength(1);
  });

  it('returns 404 when not found', async () => {
    mockGetGR.mockResolvedValue(null);

    const res = await GET_BY_ID(makeRequest('/api/inventory/goods-receipts/missing'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/inventory/goods-receipts/[id]/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user-1');
    mockFeatureEnabled.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true, remaining: 60, reset: 0 });
    mockCreateClient.mockResolvedValue({ client: fakeSb, error: null } as never);
  });

  it('confirms GR and creates ledger entries', async () => {
    const confirmed = { id: 'gr-1', status: 'confirmed' };
    mockConfirmGR.mockResolvedValue(confirmed as never);

    const res = await POST_CONFIRM(
      makeRequest('/api/inventory/goods-receipts/gr-1/confirm', { method: 'POST' }),
      { params: Promise.resolve({ id: 'gr-1' }) },
    );
    expect(res.status).toBe(200);
    expect(mockConfirmGR).toHaveBeenCalledWith(fakeSb, 'gr-1', 'user-1');
  });

  it('returns 400 on status transition error', async () => {
    mockConfirmGR.mockRejectedValue(new Error('Cannot confirm GR in status "confirmed"'));

    const res = await POST_CONFIRM(
      makeRequest('/api/inventory/goods-receipts/gr-1/confirm', { method: 'POST' }),
      { params: Promise.resolve({ id: 'gr-1' }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Cannot confirm');
  });
});
