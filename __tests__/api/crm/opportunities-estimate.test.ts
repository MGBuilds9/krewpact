import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockAuth = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}));

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockOrder = vi.fn();

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: () => ({
    from: mockFrom,
  }),
}));

// Dynamic imports to use mocks
const { GET, POST } = await import('@/app/api/crm/opportunities/[id]/estimate/route');

function makeContext(id = 'opp-123') {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body?: unknown) {
  if (body) {
    return new Request('http://localhost/api/crm/opportunities/opp-123/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  return new Request('http://localhost/api/crm/opportunities/opp-123/estimate');
}

describe('GET /api/crm/opportunities/[id]/estimate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await GET(makeRequest() as never, makeContext());
    expect(res.status).toBe(401);
  });

  it('returns 404 when opportunity not found', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => ({ data: null, error: { code: 'PGRST116', message: 'Not found' } }),
        }),
      }),
    });
    const res = await GET(makeRequest() as never, makeContext());
    expect(res.status).toBe(404);
  });

  it('returns estimates for a valid opportunity', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    const estimates = [
      { id: 'est-1', estimate_number: 'EST-001', total_amount: 5000, status: 'draft' },
    ];
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // opportunity check
        return {
          select: () => ({
            eq: () => ({
              single: () => ({ data: { id: 'opp-123' }, error: null }),
            }),
          }),
        };
      }
      // estimates query
      return {
        select: () => ({
          eq: () => ({
            order: () => ({ data: estimates, error: null }),
          }),
        }),
      };
    });
    const res = await GET(makeRequest() as never, makeContext());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(estimates);
  });
});

describe('POST /api/crm/opportunities/[id]/estimate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(
      makeRequest({ estimate_number: 'EST-001', total_amount: 1000 }) as never,
      makeContext(),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid body', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    const res = await POST(
      makeRequest({ total_amount: -1 }) as never,
      makeContext(),
    );
    expect(res.status).toBe(400);
  });

  it('creates an estimate linked to the opportunity', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-1' });
    const created = { id: 'est-new', estimate_number: 'EST-003', total_amount: 7500, status: 'draft', opportunity_id: 'opp-123' };
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // opportunity check
        return {
          select: () => ({
            eq: () => ({
              single: () => ({ data: { id: 'opp-123', division_id: 'div-1' }, error: null }),
            }),
          }),
        };
      }
      // insert
      return {
        insert: () => ({
          select: () => ({
            single: () => ({ data: created, error: null }),
          }),
        }),
      };
    });
    const res = await POST(
      makeRequest({ estimate_number: 'EST-003', total_amount: 7500 }) as never,
      makeContext(),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.estimate_number).toBe('EST-003');
  });
});
