/**
 * Tests for GET /api/finance/job-costs/[id]
 *
 * Covers: auth, GET by id, 404.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/finance/job-costs/[id]/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const sampleJobCost = {
  id: 'jc-1',
  project_id: 'proj-1',
  snapshot_date: '2026-03-01',
  baseline_budget: 500000,
  revised_budget: 520000,
  committed_cost: 350000,
  actual_cost: 280000,
  forecast_cost: 510000,
  forecast_margin_pct: 0.02,
  payload: { line_items: [] },
  created_at: '2026-03-01T00:00:00Z',
};

describe('GET /api/finance/job-costs/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/finance/job-costs/jc-1'), makeContext('jc-1'));
    expect(res.status).toBe(401);
  });

  it('returns job cost snapshot by id', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { job_cost_snapshots: { data: sampleJobCost, error: null } } }),
    );

    const res = await GET(makeRequest('/api/finance/job-costs/jc-1'), makeContext('jc-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('jc-1');
    expect(body.baseline_budget).toBe(500000);
    expect(body.payload).toBeDefined();
  });

  it('returns 404 when not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { job_cost_snapshots: { data: null, error: { message: 'Not found', code: 'PGRST116' } } },
      }),
    );

    const res = await GET(makeRequest('/api/finance/job-costs/missing'), makeContext('missing'));
    expect(res.status).toBe(404);
  });
});
