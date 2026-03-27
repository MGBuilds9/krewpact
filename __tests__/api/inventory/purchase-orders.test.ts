vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn(),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: vi.fn(),
}));
vi.mock('@/lib/request-context', () => ({
  requestContext: { run: vi.fn((_, fn) => fn()) },
  generateRequestId: vi.fn().mockReturnValue('req_test'),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));
vi.mock('@/lib/inventory/purchase-orders', () => ({
  createPurchaseOrder: vi.fn(),
  listPurchaseOrders: vi.fn(),
  getPurchaseOrder: vi.fn(),
  submitPo: vi.fn(),
  approvePo: vi.fn(),
  cancelPo: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeJsonRequest, makeRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { POST as POST_APPROVE } from '@/app/api/inventory/purchase-orders/[id]/approve/route';
import { POST as POST_CANCEL } from '@/app/api/inventory/purchase-orders/[id]/cancel/route';
import { GET as GET_BY_ID } from '@/app/api/inventory/purchase-orders/[id]/route';
import { POST as POST_SUBMIT } from '@/app/api/inventory/purchase-orders/[id]/submit/route';
import { GET, POST } from '@/app/api/inventory/purchase-orders/route';
import { rateLimit } from '@/lib/api/rate-limit';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  approvePo,
  cancelPo,
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  submitPo,
} from '@/lib/inventory/purchase-orders';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateClient = vi.mocked(createUserClientSafe);
const mockRateLimit = vi.mocked(rateLimit);
const mockFeatureEnabled = vi.mocked(isFeatureEnabled);
const mockCreatePO = vi.mocked(createPurchaseOrder);
const mockListPOs = vi.mocked(listPurchaseOrders);
const mockGetPO = vi.mocked(getPurchaseOrder);
const mockSubmitPo = vi.mocked(submitPo);
const mockApprovePo = vi.mocked(approvePo);
const mockCancelPo = vi.mocked(cancelPo);

const fakeSb = {} as never;

const validPOBody = {
  division_id: 'a0000000-0000-4000-8000-000000000001',
  supplier_id: 'b0000000-0000-4000-8000-000000000002',
  lines: [
    {
      item_id: 'c0000000-0000-4000-8000-000000000003',
      description: 'Copper wire 12 AWG',
      qty_ordered: 100,
      unit_price: 2.5,
    },
  ],
};

describe('GET /api/inventory/purchase-orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user-1');
    mockFeatureEnabled.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true, remaining: 60, reset: 0 });
    mockCreateClient.mockResolvedValue({ client: fakeSb, error: null } as never);
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/inventory/purchase-orders'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 when feature disabled', async () => {
    mockFeatureEnabled.mockReturnValue(false);
    const res = await GET(makeRequest('/api/inventory/purchase-orders'));
    expect(res.status).toBe(404);
  });

  it('returns list with filters', async () => {
    const poList = { data: [{ id: 'po-1', po_number: 'PO-2026-0001' }], total: 1 };
    mockListPOs.mockResolvedValue(poList as never);

    const res = await GET(
      makeRequest('/api/inventory/purchase-orders?division_id=div-1&status=draft'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(mockListPOs).toHaveBeenCalledWith(
      fakeSb,
      expect.objectContaining({ divisionId: 'div-1', status: 'draft' }),
    );
  });
});

describe('POST /api/inventory/purchase-orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user-1');
    mockFeatureEnabled.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true, remaining: 60, reset: 0 });
    mockCreateClient.mockResolvedValue({ client: fakeSb, error: null } as never);
  });

  it('creates PO with lines', async () => {
    const createdPO = { id: 'po-1', po_number: 'PO-2026-0001', lines: [] };
    mockCreatePO.mockResolvedValue(createdPO as never);

    const res = await POST(makeJsonRequest('/api/inventory/purchase-orders', validPOBody));
    expect(res.status).toBe(201);
    expect(mockCreatePO).toHaveBeenCalledWith(
      fakeSb,
      expect.objectContaining({
        division_id: validPOBody.division_id,
        created_by: 'user-1',
        lines: validPOBody.lines,
      }),
    );
  });

  it('returns 400 on empty lines array', async () => {
    const res = await POST(
      makeJsonRequest('/api/inventory/purchase-orders', {
        ...validPOBody,
        lines: [],
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid JSON', async () => {
    const res = await POST(
      makeRequest('/api/inventory/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/inventory/purchase-orders/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user-1');
    mockFeatureEnabled.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true, remaining: 60, reset: 0 });
    mockCreateClient.mockResolvedValue({ client: fakeSb, error: null } as never);
  });

  it('returns PO with lines', async () => {
    const po = { id: 'po-1', po_number: 'PO-2026-0001', lines: [{ id: 'line-1' }] };
    mockGetPO.mockResolvedValue(po as never);

    const res = await GET_BY_ID(makeRequest('/api/inventory/purchase-orders/po-1'), {
      params: Promise.resolve({ id: 'po-1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lines).toHaveLength(1);
  });

  it('returns 404 when PO not found', async () => {
    mockGetPO.mockResolvedValue(null);

    const res = await GET_BY_ID(makeRequest('/api/inventory/purchase-orders/missing'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /api/inventory/purchase-orders/[id]/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user-1');
    mockFeatureEnabled.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true, remaining: 60, reset: 0 });
    mockCreateClient.mockResolvedValue({ client: fakeSb, error: null } as never);
  });

  it('approves PO and passes userId', async () => {
    const approved = { id: 'po-1', status: 'approved' };
    mockApprovePo.mockResolvedValue(approved as never);

    const res = await POST_APPROVE(
      makeRequest('/api/inventory/purchase-orders/po-1/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: 'po-1' }) },
    );
    expect(res.status).toBe(200);
    expect(mockApprovePo).toHaveBeenCalledWith(fakeSb, 'po-1', 'user-1');
  });

  it('returns 400 on status transition error', async () => {
    mockApprovePo.mockRejectedValue(new Error('Cannot approve PO in status "draft"'));

    const res = await POST_APPROVE(
      makeRequest('/api/inventory/purchase-orders/po-1/approve', { method: 'POST' }),
      { params: Promise.resolve({ id: 'po-1' }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Cannot approve');
  });
});

describe('POST /api/inventory/purchase-orders/[id]/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user-1');
    mockFeatureEnabled.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true, remaining: 60, reset: 0 });
    mockCreateClient.mockResolvedValue({ client: fakeSb, error: null } as never);
  });

  it('submits PO', async () => {
    const submitted = { id: 'po-1', status: 'submitted' };
    mockSubmitPo.mockResolvedValue(submitted as never);

    const res = await POST_SUBMIT(
      makeRequest('/api/inventory/purchase-orders/po-1/submit', { method: 'POST' }),
      { params: Promise.resolve({ id: 'po-1' }) },
    );
    expect(res.status).toBe(200);
    expect(mockSubmitPo).toHaveBeenCalledWith(fakeSb, 'po-1');
  });
});

describe('POST /api/inventory/purchase-orders/[id]/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user-1');
    mockFeatureEnabled.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true, remaining: 60, reset: 0 });
    mockCreateClient.mockResolvedValue({ client: fakeSb, error: null } as never);
  });

  it('cancels PO from draft', async () => {
    const cancelled = { id: 'po-1', status: 'cancelled' };
    mockCancelPo.mockResolvedValue(cancelled as never);

    const res = await POST_CANCEL(
      makeRequest('/api/inventory/purchase-orders/po-1/cancel', { method: 'POST' }),
      { params: Promise.resolve({ id: 'po-1' }) },
    );
    expect(res.status).toBe(200);
    expect(mockCancelPo).toHaveBeenCalledWith(fakeSb, 'po-1');
  });

  it('returns 400 on invalid transition', async () => {
    mockCancelPo.mockRejectedValue(new Error('Cannot cancel PO in status "approved"'));

    const res = await POST_CANCEL(
      makeRequest('/api/inventory/purchase-orders/po-1/cancel', { method: 'POST' }),
      { params: Promise.resolve({ id: 'po-1' }) },
    );
    expect(res.status).toBe(400);
  });
});
