/**
 * Tests for GET /api/finance/dashboard
 *
 * Verifies:
 * - 401 when unauthenticated
 * - Aggregated dashboard metrics (AR, PO, job costs)
 * - Handles DB errors gracefully (500)
 * - Returns zero values when no data exists
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireRole = vi.fn();
vi.mock('@/lib/api/org', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
  getKrewpactRoles: vi.fn().mockResolvedValue(['platform_admin']),
  getKrewpactOrgId: vi.fn().mockResolvedValue('test-org-00000000-0000-0000-0000-000000000000'),
  getKrewpactUserId: vi.fn().mockResolvedValue('test-user-id'),
  getOrgIdFromAuth: vi.fn().mockResolvedValue('mdm-group'),
}));
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

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import {
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

describe('GET /api/finance/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ userId: 'test-user-id', roles: ['platform_admin'] });
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );

    const { GET } = await import('@/app/api/finance/dashboard/route');
    const res = await GET(makeRequest('/api/finance/dashboard'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns aggregated dashboard metrics', async () => {
    mockClerkAuth(mockAuth);

    const client = mockSupabaseClient({
      tables: {
        invoice_snapshots: {
          data: [
            { id: 'inv-1', total_amount: 10000, amount_paid: 3000, status: 'submitted' },
            { id: 'inv-2', total_amount: 25000, amount_paid: 25000, status: 'paid' },
            { id: 'inv-3', total_amount: 15000, amount_paid: 0, status: 'overdue' },
          ],
          error: null,
        },
        po_snapshots: {
          data: [
            { id: 'po-1', total_amount: 30000 },
            { id: 'po-2', total_amount: 45000 },
          ],
          error: null,
        },
        job_cost_snapshots: {
          data: [{ id: 'jc-1' }, { id: 'jc-2' }, { id: 'jc-3' }],
          error: null,
        },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const { GET } = await import('@/app/api/finance/dashboard/route');
    const res = await GET(makeRequest('/api/finance/dashboard'));
    expect(res.status).toBe(200);

    const body = await res.json();
    // AR: (10000-3000) + (25000-25000) + (15000-0) = 7000 + 0 + 15000 = 22000
    expect(body.accounts_receivable.total_outstanding).toBe(22000);
    expect(body.accounts_receivable.invoice_count).toBe(3);
    // PO: 30000 + 45000 = 75000
    expect(body.purchase_orders.total_value).toBe(75000);
    expect(body.purchase_orders.po_count).toBe(2);
    // Job costs: 3 snapshots
    expect(body.job_costs.snapshot_count).toBe(3);
  });

  it('returns zero values when no data exists', async () => {
    mockClerkAuth(mockAuth);

    const client = mockSupabaseClient({
      tables: {
        invoice_snapshots: { data: [], error: null },
        po_snapshots: { data: [], error: null },
        job_cost_snapshots: { data: [], error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const { GET } = await import('@/app/api/finance/dashboard/route');
    const res = await GET(makeRequest('/api/finance/dashboard'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.accounts_receivable.total_outstanding).toBe(0);
    expect(body.accounts_receivable.invoice_count).toBe(0);
    expect(body.purchase_orders.total_value).toBe(0);
    expect(body.purchase_orders.po_count).toBe(0);
    expect(body.job_costs.snapshot_count).toBe(0);
  });

  it('returns 500 when invoice query fails', async () => {
    mockClerkAuth(mockAuth);

    const client = mockSupabaseClient({
      tables: {
        invoice_snapshots: { data: null, error: { message: 'DB error' } },
        po_snapshots: { data: [], error: null },
        job_cost_snapshots: { data: [], error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const { GET } = await import('@/app/api/finance/dashboard/route');
    const res = await GET(makeRequest('/api/finance/dashboard'));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Failed to fetch finance data');
  });

  it('returns 500 when PO query fails', async () => {
    mockClerkAuth(mockAuth);

    const client = mockSupabaseClient({
      tables: {
        invoice_snapshots: { data: [], error: null },
        po_snapshots: { data: null, error: { message: 'Connection lost' } },
        job_cost_snapshots: { data: [], error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const { GET } = await import('@/app/api/finance/dashboard/route');
    const res = await GET(makeRequest('/api/finance/dashboard'));
    expect(res.status).toBe(500);
  });

  it('returns 500 when job cost query fails', async () => {
    mockClerkAuth(mockAuth);

    const client = mockSupabaseClient({
      tables: {
        invoice_snapshots: { data: [], error: null },
        po_snapshots: { data: [], error: null },
        job_cost_snapshots: { data: null, error: { message: 'Timeout' } },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const { GET } = await import('@/app/api/finance/dashboard/route');
    const res = await GET(makeRequest('/api/finance/dashboard'));
    expect(res.status).toBe(500);
  });
});
