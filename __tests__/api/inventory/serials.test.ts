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
vi.mock('@/lib/inventory/serials', () => ({
  createSerial: vi.fn(),
  listSerials: vi.fn(),
  getSerial: vi.fn(),
  getSerialHistory: vi.fn(),
  checkoutSerial: vi.fn(),
  returnSerial: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeJsonRequest, makeRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { POST as POST_CHECKOUT } from '@/app/api/inventory/serials/[id]/checkout/route';
import { POST as POST_RETURN } from '@/app/api/inventory/serials/[id]/return/route';
import { GET as GET_BY_ID } from '@/app/api/inventory/serials/[id]/route';
import { GET, POST } from '@/app/api/inventory/serials/route';
import { rateLimit } from '@/lib/api/rate-limit';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  checkoutSerial,
  createSerial,
  getSerial,
  getSerialHistory,
  listSerials,
  returnSerial,
} from '@/lib/inventory/serials';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateClient = vi.mocked(createUserClientSafe);
const mockRateLimit = vi.mocked(rateLimit);
const mockFeatureEnabled = vi.mocked(isFeatureEnabled);
const mockCreateSerial = vi.mocked(createSerial);
const mockListSerials = vi.mocked(listSerials);
const mockGetSerial = vi.mocked(getSerial);
const mockGetHistory = vi.mocked(getSerialHistory);
const mockCheckout = vi.mocked(checkoutSerial);
const mockReturn = vi.mocked(returnSerial);

const fakeSb = {} as never;

describe('GET /api/inventory/serials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user-1');
    mockFeatureEnabled.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true, remaining: 60, reset: 0 });
    mockCreateClient.mockResolvedValue({ client: fakeSb, error: null } as never);
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/inventory/serials'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 when feature disabled', async () => {
    mockFeatureEnabled.mockReturnValue(false);
    const res = await GET(makeRequest('/api/inventory/serials'));
    expect(res.status).toBe(404);
  });

  it('returns list with status filter', async () => {
    const serialList = { data: [{ id: 'serial-1', serial_number: 'SN-001' }], total: 1 };
    mockListSerials.mockResolvedValue(serialList as never);

    const res = await GET(makeRequest('/api/inventory/serials?status=in_stock'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(mockListSerials).toHaveBeenCalledWith(
      fakeSb,
      expect.objectContaining({ status: 'in_stock' }),
    );
  });

  it('passes all filter params', async () => {
    mockListSerials.mockResolvedValue({ data: [], total: 0 } as never);

    await GET(
      makeRequest(
        '/api/inventory/serials?division_id=d1&item_id=i1&location_id=l1&checked_out_to=u1&search=drill',
      ),
    );
    expect(mockListSerials).toHaveBeenCalledWith(
      fakeSb,
      expect.objectContaining({
        divisionId: 'd1',
        itemId: 'i1',
        locationId: 'l1',
        checkedOutTo: 'u1',
        search: 'drill',
      }),
    );
  });
});

describe('POST /api/inventory/serials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user-1');
    mockFeatureEnabled.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true, remaining: 60, reset: 0 });
    mockCreateClient.mockResolvedValue({ client: fakeSb, error: null } as never);
  });

  it('creates serial', async () => {
    const created = { id: 'serial-1', serial_number: 'SN-001', status: 'in_stock' };
    mockCreateSerial.mockResolvedValue(created as never);

    const res = await POST(
      makeJsonRequest('/api/inventory/serials', {
        item_id: 'a0000000-0000-4000-8000-000000000001',
        division_id: 'b0000000-0000-4000-8000-000000000002',
        serial_number: 'SN-001',
      }),
    );
    expect(res.status).toBe(201);
  });

  it('returns 400 on missing serial_number', async () => {
    const res = await POST(
      makeJsonRequest('/api/inventory/serials', {
        item_id: 'a0000000-0000-4000-8000-000000000001',
        division_id: 'b0000000-0000-4000-8000-000000000002',
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/inventory/serials/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user-1');
    mockFeatureEnabled.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true, remaining: 60, reset: 0 });
    mockCreateClient.mockResolvedValue({ client: fakeSb, error: null } as never);
  });

  it('returns serial with history', async () => {
    const serial = { id: 'serial-1', serial_number: 'SN-001', status: 'in_stock' };
    const history = [{ id: 'ledger-1', transaction_type: 'purchase_receipt' }];
    mockGetSerial.mockResolvedValue(serial as never);
    mockGetHistory.mockResolvedValue(history as never);

    const res = await GET_BY_ID(makeRequest('/api/inventory/serials/serial-1'), {
      params: Promise.resolve({ id: 'serial-1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.serial_number).toBe('SN-001');
    expect(body.history).toHaveLength(1);
  });

  it('returns 404 when serial not found', async () => {
    mockGetSerial.mockResolvedValue(null);

    const res = await GET_BY_ID(makeRequest('/api/inventory/serials/missing'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /api/inventory/serials/[id]/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user-1');
    mockFeatureEnabled.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true, remaining: 60, reset: 0 });
    mockCreateClient.mockResolvedValue({ client: fakeSb, error: null } as never);
  });

  it('calls checkoutSerial with transacted_by', async () => {
    const result = {
      serial: { id: 'serial-1', status: 'checked_out' },
      ledgerEntry: { id: 'ledger-1' },
    };
    mockCheckout.mockResolvedValue(result as never);

    const res = await POST_CHECKOUT(
      makeJsonRequest('/api/inventory/serials/serial-1/checkout', {
        checked_out_to: 'John Doe',
        project_id: 'e0000000-0000-4000-8000-000000000005',
      }),
      { params: Promise.resolve({ id: 'serial-1' }) },
    );
    expect(res.status).toBe(201);
    expect(mockCheckout).toHaveBeenCalledWith(fakeSb, 'serial-1', {
      checked_out_to: 'John Doe',
      project_id: 'e0000000-0000-4000-8000-000000000005',
      transacted_by: 'user-1',
    });
  });

  it('returns 400 when serial already checked out', async () => {
    mockCheckout.mockRejectedValue(new Error('Serial is already checked out'));

    const res = await POST_CHECKOUT(
      makeJsonRequest('/api/inventory/serials/serial-1/checkout', {
        checked_out_to: 'John Doe',
      }),
      { params: Promise.resolve({ id: 'serial-1' }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('already checked out');
  });

  it('returns 400 on missing checked_out_to', async () => {
    const res = await POST_CHECKOUT(
      makeJsonRequest('/api/inventory/serials/serial-1/checkout', {}),
      { params: Promise.resolve({ id: 'serial-1' }) },
    );
    expect(res.status).toBe(400);
  });
});

describe('POST /api/inventory/serials/[id]/return', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth, 'user-1');
    mockFeatureEnabled.mockReturnValue(true);
    mockRateLimit.mockResolvedValue({ success: true, remaining: 60, reset: 0 });
    mockCreateClient.mockResolvedValue({ client: fakeSb, error: null } as never);
  });

  it('calls returnSerial with transacted_by', async () => {
    const result = {
      serial: { id: 'serial-1', status: 'in_stock' },
      ledgerEntry: { id: 'ledger-2' },
    };
    mockReturn.mockResolvedValue(result as never);

    const res = await POST_RETURN(
      makeJsonRequest('/api/inventory/serials/serial-1/return', {
        return_location_id: 'f0000000-0000-4000-8000-000000000006',
        condition_notes: 'Good condition',
      }),
      { params: Promise.resolve({ id: 'serial-1' }) },
    );
    expect(res.status).toBe(201);
    expect(mockReturn).toHaveBeenCalledWith(fakeSb, 'serial-1', {
      return_location_id: 'f0000000-0000-4000-8000-000000000006',
      condition_notes: 'Good condition',
      transacted_by: 'user-1',
    });
  });

  it('returns 400 when serial is not checked out', async () => {
    mockReturn.mockRejectedValue(new Error('Serial is not checked out'));

    const res = await POST_RETURN(
      makeJsonRequest('/api/inventory/serials/serial-1/return', {
        return_location_id: 'f0000000-0000-4000-8000-000000000006',
      }),
      { params: Promise.resolve({ id: 'serial-1' }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('not checked out');
  });

  it('returns 400 on missing return_location_id', async () => {
    const res = await POST_RETURN(makeJsonRequest('/api/inventory/serials/serial-1/return', {}), {
      params: Promise.resolve({ id: 'serial-1' }),
    });
    expect(res.status).toBe(400);
  });
});
