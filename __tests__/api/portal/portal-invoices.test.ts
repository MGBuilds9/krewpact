/**
 * Tests for /api/portal/projects/[id]/invoices (GET).
 *
 * Covers: auth, portal permission guard, view_financials permission, pagination, DB errors.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));

import { auth } from '@clerk/nextjs/server';

import {
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { GET } from '@/app/api/portal/projects/[id]/invoices/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const sampleSnapshot = {
  id: 'snap-1',
  snapshot_date: '2026-03-01',
  period_label: 'March 2026',
  labour_cost: 25000,
  material_cost: 18000,
  subcontract_cost: 40000,
  overhead_cost: 5000,
  total_cost: 88000,
  budget_total: 100000,
  variance: -12000,
  margin_pct: 12.0,
  created_at: '2026-03-01T00:00:00Z',
};

describe('GET /api/portal/projects/[id]/invoices', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/invoices'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when no portal account', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          portal_accounts: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/invoices'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when view_financials is not granted', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          portal_accounts: { data: { id: 'pa-1', status: 'active' }, error: null },
          portal_permissions: {
            data: { permission_set: { view_financials: false } },
            error: null,
          },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/invoices'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns job cost snapshots when permitted', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          portal_accounts: { data: { id: 'pa-1', status: 'active' }, error: null },
          portal_permissions: {
            data: { permission_set: { view_financials: true } },
            error: null,
          },
          job_cost_snapshots: { data: [sampleSnapshot], error: null },
          portal_view_logs: { data: null, error: null },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/invoices'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].total_cost).toBe(88000);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          portal_accounts: { data: { id: 'pa-1', status: 'active' }, error: null },
          portal_permissions: {
            data: { permission_set: { view_financials: true } },
            error: null,
          },
          job_cost_snapshots: { data: null, error: { message: 'DB error' } },
          portal_view_logs: { data: null, error: null },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/invoices'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(500);
  });
});
