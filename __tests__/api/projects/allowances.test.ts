/**
 * Tests for /api/projects/[id]/allowances (GET + POST).
 * Table: allowance_reconciliations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET, POST } from '@/app/api/projects/[id]/allowances/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  TEST_IDS,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

function projectCtx() {
  return { params: Promise.resolve({ id: TEST_IDS.PROJECT_ID }) };
}

const sampleAllowance = {
  id: '00000000-0000-4000-a000-000000000501',
  project_id: TEST_IDS.PROJECT_ID,
  category_name: 'Flooring',
  allowance_budget: 10000,
  selected_cost: 8500,
  variance: 1500,
  last_reconciled_at: '2026-02-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

/* --- LIST --- */
describe('GET /api/projects/[id]/allowances', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/projects/x/allowances'), projectCtx());
    expect(res.status).toBe(401);
  });

  it('returns allowances list', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { allowance_reconciliations: { data: [sampleAllowance], error: null, count: 1 } },
      }),
    );
    const res = await GET(makeRequest('/api/projects/x/allowances'), projectCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].category_name).toBe('Flooring');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          allowance_reconciliations: { data: null, error: { message: 'err' }, count: null },
        },
      }),
    );
    const res = await GET(makeRequest('/api/projects/x/allowances'), projectCtx());
    expect(res.status).toBe(500);
  });
});

/* --- CREATE --- */
describe('POST /api/projects/[id]/allowances', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(makeJsonRequest('/api/projects/x/allowances', {}), projectCtx());
    expect(res.status).toBe(401);
  });

  it('returns 201 on valid creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { allowance_reconciliations: { data: sampleAllowance, error: null } },
      }),
    );
    const res = await POST(
      makeJsonRequest('/api/projects/x/allowances', {
        category_name: 'Flooring',
        allowance_budget: 10000,
        selected_cost: 8500,
        variance: 1500,
      }),
      projectCtx(),
    );
    expect(res.status).toBe(201);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { allowance_reconciliations: { data: null, error: { message: 'insert err' } } },
      }),
    );
    const res = await POST(
      makeJsonRequest('/api/projects/x/allowances', {
        category_name: 'Flooring',
        allowance_budget: 10000,
        selected_cost: 8500,
        variance: 1500,
      }),
      projectCtx(),
    );
    expect(res.status).toBe(500);
  });
});
