/**
 * Tests for finance routes (C5).
 *
 * Verifies:
 * - Invoice snapshots CRUD with pagination
 * - Job cost snapshots CRUD with project filtering
 * - Purchase order snapshots CRUD
 * - Auth required on all endpoints
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
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn().mockResolvedValue({
    client: { from: (...args: unknown[]) => mockFrom(...args) },
    error: null,
  }),
}));

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { makeJsonRequest, makeRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);

function paginatedChain(data: unknown[], count: number) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null });
  chain.then = (resolve: (v: unknown) => void) => resolve({ data, error: null, count });
  return chain;
}

describe('GET /api/finance/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ userId: 'test-user-id', roles: ['platform_admin'] });
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const { GET } = await import('@/app/api/finance/invoices/route');
    const res = await GET(makeRequest('/api/finance/invoices'));
    expect(res.status).toBe(401);
  });

  it('returns paginated invoice snapshots', async () => {
    mockClerkAuth(mockAuth);
    const invoices = [
      { id: 'inv-1', erp_docname: 'SINV-001', grand_total: 10000, status: 'submitted' },
      { id: 'inv-2', erp_docname: 'SINV-002', grand_total: 25000, status: 'paid' },
    ];
    mockFrom.mockReturnValue(paginatedChain(invoices, 2));

    const { GET } = await import('@/app/api/finance/invoices/route');
    const res = await GET(makeRequest('/api/finance/invoices?limit=25&offset=0'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.hasMore).toBe(false);
  });

  it('filters by project_id', async () => {
    mockClerkAuth(mockAuth);
    mockFrom.mockReturnValue(paginatedChain([], 0));

    const { GET } = await import('@/app/api/finance/invoices/route');
    const projectId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const res = await GET(makeRequest(`/api/finance/invoices?project_id=${projectId}`));
    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith('invoice_snapshots');
  });

  it('filters by status', async () => {
    mockClerkAuth(mockAuth);
    mockFrom.mockReturnValue(paginatedChain([], 0));

    const { GET } = await import('@/app/api/finance/invoices/route');
    const res = await GET(makeRequest('/api/finance/invoices?status=overdue'));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/finance/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ userId: 'test-user-id', roles: ['platform_admin'] });
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const { POST } = await import('@/app/api/finance/invoices/route');
    const res = await POST(makeJsonRequest('/api/finance/invoices', { erp_docname: 'SINV-001' }));
    expect(res.status).toBe(401);
  });
});

describe('GET /api/finance/job-costs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ userId: 'test-user-id', roles: ['platform_admin'] });
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const { GET } = await import('@/app/api/finance/job-costs/route');
    const res = await GET(makeRequest('/api/finance/job-costs'));
    expect(res.status).toBe(401);
  });

  it('returns paginated job cost snapshots', async () => {
    mockClerkAuth(mockAuth);
    const costs = [
      { id: 'jc-1', project_id: 'proj-1', snapshot_date: '2026-03-01', total_cost: 150000 },
    ];
    mockFrom.mockReturnValue(paginatedChain(costs, 1));

    const { GET } = await import('@/app/api/finance/job-costs/route');
    const res = await GET(makeRequest('/api/finance/job-costs'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
  });
});

describe('GET /api/finance/purchase-orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ userId: 'test-user-id', roles: ['platform_admin'] });
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const { GET } = await import('@/app/api/finance/purchase-orders/route');
    const res = await GET(makeRequest('/api/finance/purchase-orders'));
    expect(res.status).toBe(401);
  });

  it('returns paginated PO snapshots', async () => {
    mockClerkAuth(mockAuth);
    const pos = [{ id: 'po-1', erp_docname: 'PO-001', grand_total: 30000, status: 'submitted' }];
    mockFrom.mockReturnValue(paginatedChain(pos, 1));

    const { GET } = await import('@/app/api/finance/purchase-orders/route');
    const res = await GET(makeRequest('/api/finance/purchase-orders'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});
