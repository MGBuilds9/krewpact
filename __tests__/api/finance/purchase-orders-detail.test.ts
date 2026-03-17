/**
 * Tests for GET/PATCH /api/finance/purchase-orders/[id]
 *
 * Covers: auth, GET by id, PATCH update, 404, validation, DB errors.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { GET, PATCH } from '@/app/api/finance/purchase-orders/[id]/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const samplePO = {
  id: 'po-1',
  project_id: 'proj-1',
  po_number: 'PO-001',
  supplier_name: 'Lumber Depot',
  po_date: '2026-03-01',
  status: 'submitted',
  subtotal_amount: 25000,
  tax_amount: 3250,
  total_amount: 28250,
  erp_docname: 'PO-001',
  snapshot_payload: { items: [] },
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

describe('GET /api/finance/purchase-orders/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/finance/purchase-orders/po-1'), makeContext('po-1'));
    expect(res.status).toBe(401);
  });

  it('returns PO by id', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { po_snapshots: { data: samplePO, error: null } } }),
      error: null,
    });

    const res = await GET(makeRequest('/api/finance/purchase-orders/po-1'), makeContext('po-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('po-1');
    expect(body.po_number).toBe('PO-001');
    expect(body.snapshot_payload).toBeDefined();
  });

  it('returns 404 when not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { po_snapshots: { data: null, error: { message: 'Not found', code: 'PGRST116' } } },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/finance/purchase-orders/missing'),
      makeContext('missing'),
    );
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/finance/purchase-orders/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/finance/purchase-orders/po-1', { status: 'approved' }, 'PATCH'),
      makeContext('po-1'),
    );
    expect(res.status).toBe(401);
  });

  it('updates PO fields', async () => {
    mockClerkAuth(mockAuth);
    const updated = { ...samplePO, status: 'approved' };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { po_snapshots: { data: updated, error: null } } }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest('/api/finance/purchase-orders/po-1', { status: 'approved' }, 'PATCH'),
      makeContext('po-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('approved');
  });

  it('returns 400 for invalid data', async () => {
    mockClerkAuth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/finance/purchase-orders/po-1', { status: 'invalid' }, 'PATCH'),
      makeContext('po-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { po_snapshots: { data: null, error: { message: 'DB error', code: '42000' } } },
      }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest('/api/finance/purchase-orders/po-1', { supplier_name: 'Updated' }, 'PATCH'),
      makeContext('po-1'),
    );
    expect(res.status).toBe(500);
  });
});
