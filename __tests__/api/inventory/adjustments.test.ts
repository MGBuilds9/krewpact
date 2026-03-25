import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: vi.fn(),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

vi.mock('@/lib/inventory/ledger', () => ({
  createLedgerEntry: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { POST } from '@/app/api/inventory/adjustments/route';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { createLedgerEntry } from '@/lib/inventory/ledger';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockIsFeatureEnabled = vi.mocked(isFeatureEnabled);
const mockCreateLedgerEntry = vi.mocked(createLedgerEntry);

const VALID_BODY = {
  item_id: '00000000-0000-4000-a000-000000000001',
  location_id: '00000000-0000-4000-a000-000000000002',
  division_id: '00000000-0000-4000-a000-000000000003',
  qty_change: -5,
  reason_code: 'damage',
  notes: 'Broken on site',
};

describe('POST /api/inventory/adjustments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFeatureEnabled.mockReturnValue(true);
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(makeRequest('/api/inventory/adjustments', { method: 'POST' }));
    expect(res.status).toBe(401);
  });

  it('returns 404 when feature is disabled', async () => {
    mockClerkAuth(mockAuth);
    mockIsFeatureEnabled.mockReturnValue(false);
    const res = await POST(makeJsonRequest('/api/inventory/adjustments', VALID_BODY));
    expect(res.status).toBe(404);
  });

  it('returns 400 when qty_change is 0', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({ client: mockSupabaseClient(), error: null });
    const res = await POST(
      makeJsonRequest('/api/inventory/adjustments', { ...VALID_BODY, qty_change: 0 }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when reason_code is missing', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({ client: mockSupabaseClient(), error: null });
    const { reason_code: _rc, ...body } = VALID_BODY;
    const res = await POST(makeJsonRequest('/api/inventory/adjustments', body));
    expect(res.status).toBe(400);
  });

  it('creates a stock_adjustment ledger entry with valid data', async () => {
    mockClerkAuth(mockAuth, 'user_abc');
    mockCreateUserClientSafe.mockResolvedValue({ client: mockSupabaseClient(), error: null });
    const entry = { id: 'ledger-1', transaction_type: 'stock_adjustment', ...VALID_BODY };
    mockCreateLedgerEntry.mockResolvedValue(entry as never);

    const res = await POST(makeJsonRequest('/api/inventory/adjustments', VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('ledger-1');
  });

  it('passes transacted_by from userId', async () => {
    mockClerkAuth(mockAuth, 'user_xyz');
    mockCreateUserClientSafe.mockResolvedValue({ client: mockSupabaseClient(), error: null });
    mockCreateLedgerEntry.mockResolvedValue({ id: 'l1' } as never);

    await POST(makeJsonRequest('/api/inventory/adjustments', VALID_BODY));

    expect(mockCreateLedgerEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        transaction_type: 'stock_adjustment',
        transacted_by: 'user_xyz',
        reason_code: 'damage',
        qty_change: -5,
      }),
    );
  });

  it('returns 500 when ledger throws', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({ client: mockSupabaseClient(), error: null });
    mockCreateLedgerEntry.mockRejectedValue(new Error('DB failure'));

    const res = await POST(makeJsonRequest('/api/inventory/adjustments', VALID_BODY));
    expect(res.status).toBe(500);
  });

  it('returns 400 when body is invalid JSON', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({ client: mockSupabaseClient(), error: null });
    const res = await POST(makeRequest('/api/inventory/adjustments', { method: 'POST' }));
    expect(res.status).toBe(400);
  });
});
