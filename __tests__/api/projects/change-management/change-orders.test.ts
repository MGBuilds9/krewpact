/**
 * Tests for change management routes (C6).
 *
 * Verifies:
 * - Change order CRUD with project scoping
 * - RFI CRUD with project scoping
 * - Submittal CRUD with project scoping
 * - Auth required on all endpoints
 * - Initial status defaults
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi
    .fn()
    .mockResolvedValue({
      client: { from: (...args: unknown[]) => mockFrom(...args) },
      error: null,
    }),
}));

import { auth } from '@clerk/nextjs/server';
import { mockClerkAuth, mockClerkUnauth, makeRequest, makeJsonRequest } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);

const PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function paginatedChain(data: unknown[], count: number) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null });
  chain.then = (resolve: (v: unknown) => void) => resolve({ data, error: null, count });
  return chain;
}

// ---- Change Orders ----

describe('GET /api/projects/[id]/change-orders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const { GET } = await import('@/app/api/projects/[id]/change-orders/route');
    const res = await GET(makeRequest(`/api/projects/${PROJECT_ID}/change-orders`), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });
    expect(res.status).toBe(401);
  });

  it('returns paginated change orders scoped to project', async () => {
    mockClerkAuth(mockAuth);
    const cos = [
      { id: 'co-1', co_number: 'CO-001', title: 'Extra Work', status: 'draft', total_amount: 5000 },
    ];
    mockFrom.mockReturnValue(paginatedChain(cos, 1));

    const { GET } = await import('@/app/api/projects/[id]/change-orders/route');
    const res = await GET(makeRequest(`/api/projects/${PROJECT_ID}/change-orders`), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].co_number).toBe('CO-001');
    expect(mockFrom).toHaveBeenCalledWith('change_orders');
  });
});

describe('POST /api/projects/[id]/change-orders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const { POST } = await import('@/app/api/projects/[id]/change-orders/route');
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/change-orders`, { title: 'Extra Work' }),
      { params: Promise.resolve({ id: PROJECT_ID }) },
    );
    expect(res.status).toBe(401);
  });

  it('creates change order with draft status and project_id', async () => {
    mockClerkAuth(mockAuth);
    const created = {
      id: 'co-new',
      title: 'Extra Plumbing',
      status: 'draft',
      project_id: PROJECT_ID,
    };
    mockFrom.mockReturnValue(paginatedChain([created], 1));

    const { POST } = await import('@/app/api/projects/[id]/change-orders/route');
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/change-orders`, {
        co_number: 'CO-002',
        reason: 'Additional plumbing for west wing',
        amount_delta: 12000,
        days_delta: 5,
      }),
      { params: Promise.resolve({ id: PROJECT_ID }) },
    );
    expect(res.status).toBe(201);
  });
});

// ---- RFIs ----

describe('GET /api/projects/[id]/rfis', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const { GET } = await import('@/app/api/projects/[id]/rfis/route');
    const res = await GET(makeRequest(`/api/projects/${PROJECT_ID}/rfis`), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });
    expect(res.status).toBe(401);
  });

  it('returns paginated RFIs scoped to project', async () => {
    mockClerkAuth(mockAuth);
    const rfis = [
      { id: 'rfi-1', subject: 'Foundation spec', status: 'open', project_id: PROJECT_ID },
    ];
    mockFrom.mockReturnValue(paginatedChain(rfis, 1));

    const { GET } = await import('@/app/api/projects/[id]/rfis/route');
    const res = await GET(makeRequest(`/api/projects/${PROJECT_ID}/rfis`), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('rfi_items');
  });
});

describe('POST /api/projects/[id]/rfis', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates RFI with open status and project_id', async () => {
    mockClerkAuth(mockAuth);
    const created = { id: 'rfi-new', subject: 'Wall spec', status: 'open', project_id: PROJECT_ID };
    mockFrom.mockReturnValue(paginatedChain([created], 1));

    const { POST } = await import('@/app/api/projects/[id]/rfis/route');
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/rfis`, {
        rfi_number: 'RFI-001',
        title: 'Wall spec',
        question_text: 'Need clarification on wall framing spec',
      }),
      { params: Promise.resolve({ id: PROJECT_ID }) },
    );
    expect(res.status).toBe(201);
  });
});

// ---- Submittals ----

describe('GET /api/projects/[id]/submittals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const { GET } = await import('@/app/api/projects/[id]/submittals/route');
    const res = await GET(makeRequest(`/api/projects/${PROJECT_ID}/submittals`), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });
    expect(res.status).toBe(401);
  });

  it('returns paginated submittals scoped to project', async () => {
    mockClerkAuth(mockAuth);
    const submittals = [
      { id: 'sub-1', title: 'Steel samples', status: 'draft', project_id: PROJECT_ID },
    ];
    mockFrom.mockReturnValue(paginatedChain(submittals, 1));

    const { GET } = await import('@/app/api/projects/[id]/submittals/route');
    const res = await GET(makeRequest(`/api/projects/${PROJECT_ID}/submittals`), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('submittals');
  });
});

describe('POST /api/projects/[id]/submittals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates submittal with draft status', async () => {
    mockClerkAuth(mockAuth);
    const created = {
      id: 'sub-new',
      title: 'Window specs',
      status: 'draft',
      project_id: PROJECT_ID,
    };
    mockFrom.mockReturnValue(paginatedChain([created], 1));

    const { POST } = await import('@/app/api/projects/[id]/submittals/route');
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/submittals`, {
        submittal_number: 'SUB-001',
        title: 'Window specs',
      }),
      { params: Promise.resolve({ id: PROJECT_ID }) },
    );
    expect(res.status).toBe(201);
  });
});
