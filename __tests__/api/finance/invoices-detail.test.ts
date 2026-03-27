/**
 * Tests for GET/PATCH /api/finance/invoices/[id]
 *
 * Covers: auth, GET by id, PATCH update, 404, validation errors, DB errors.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

const mockRequireRole = vi.fn();
vi.mock('@/lib/api/org', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import {
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { GET, PATCH } from '@/app/api/finance/invoices/[id]/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const sampleInvoice = {
  id: 'inv-1',
  project_id: 'proj-1',
  invoice_number: 'INV-001',
  customer_name: 'Acme Construction',
  invoice_date: '2026-03-01',
  due_date: '2026-04-01',
  status: 'submitted',
  subtotal_amount: 10000,
  tax_amount: 1300,
  total_amount: 11300,
  amount_paid: 0,
  payment_link_url: null,
  erp_docname: 'SINV-001',
  snapshot_payload: { lines: [] },
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

describe('GET /api/finance/invoices/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ userId: 'user_123', roles: ['accounting'] });
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const res = await GET(makeRequest('/api/finance/invoices/inv-1'), makeContext('inv-1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for unauthorized role (field_supervisor)', async () => {
    mockClerkAuth(mockAuth);
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const res = await GET(makeRequest('/api/finance/invoices/inv-1'), makeContext('inv-1'));
    expect(res.status).toBe(403);
  });

  it('returns invoice by id', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { invoice_snapshots: { data: sampleInvoice, error: null } },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/finance/invoices/inv-1'), makeContext('inv-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('inv-1');
    expect(body.invoice_number).toBe('INV-001');
    expect(body.snapshot_payload).toBeDefined();
  });

  it('returns 404 when not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          invoice_snapshots: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/finance/invoices/missing'), makeContext('missing'));
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/finance/invoices/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ userId: 'user_123', roles: ['accounting'] });
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const res = await PATCH(
      makeJsonRequest('/api/finance/invoices/inv-1', { status: 'paid' }, 'PATCH'),
      makeContext('inv-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for unauthorized role (project_coordinator)', async () => {
    mockClerkAuth(mockAuth);
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const res = await PATCH(
      makeJsonRequest('/api/finance/invoices/inv-1', { status: 'paid' }, 'PATCH'),
      makeContext('inv-1'),
    );
    expect(res.status).toBe(403);
  });

  it('updates invoice fields', async () => {
    mockClerkAuth(mockAuth);
    const updated = { ...sampleInvoice, status: 'paid', amount_paid: 11300 };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { invoice_snapshots: { data: updated, error: null } } }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest(
        '/api/finance/invoices/inv-1',
        { status: 'paid', amount_paid: 11300 },
        'PATCH',
      ),
      makeContext('inv-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('paid');
    expect(body.amount_paid).toBe(11300);
  });

  it('returns 400 for invalid data', async () => {
    mockClerkAuth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/finance/invoices/inv-1', { status: 'invalid_status' }, 'PATCH'),
      makeContext('inv-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          invoice_snapshots: { data: null, error: { message: 'DB error', code: '42000' } },
        },
      }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest('/api/finance/invoices/inv-1', { customer_name: 'Updated' }, 'PATCH'),
      makeContext('inv-1'),
    );
    expect(res.status).toBe(500);
  });
});
