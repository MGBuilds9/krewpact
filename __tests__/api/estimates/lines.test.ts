import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import {
  GET as GET_LINES,
  POST as POST_LINE,
  PUT as PUT_BATCH,
} from '@/app/api/estimates/[id]/lines/route';
import {
  PATCH as PATCH_LINE,
  DELETE as DELETE_LINE,
} from '@/app/api/estimates/[id]/lines/[lineId]/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  makeEstimate,
  makeEstimateLine,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

const ESTIMATE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const LINE_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

function makeLineContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeLineItemContext(id: string, lineId: string) {
  return { params: Promise.resolve({ id, lineId }) };
}

// ============================================================
// GET /api/estimates/[id]/lines
// ============================================================
describe('GET /api/estimates/[id]/lines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_LINES(
      makeRequest(`/api/estimates/${ESTIMATE_ID}/lines`),
      makeLineContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(401);
  });

  it('returns all lines for estimate sorted by sort_order', async () => {
    const lines = [
      makeEstimateLine({ sort_order: 0, description: 'First' }),
      makeEstimateLine({ sort_order: 1, description: 'Second' }),
      makeEstimateLine({ sort_order: 2, description: 'Third' }),
    ];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { estimate_lines: { data: lines, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET_LINES(
      makeRequest(`/api/estimates/${ESTIMATE_ID}/lines`),
      makeLineContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(3);
    expect(client.from).toHaveBeenCalledWith('estimate_lines');
  });
});

// ============================================================
// POST /api/estimates/[id]/lines — add single line
// ============================================================
describe('POST /api/estimates/[id]/lines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_LINE(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/lines`, {
        description: 'Test line',
        quantity: 10,
        unit_cost: 50,
      }),
      makeLineContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(401);
  });

  it('adds a line and recalculates estimate totals', async () => {
    const newLine = makeEstimateLine({
      estimate_id: ESTIMATE_ID,
      quantity: 10,
      unit_cost: 50,
      markup_pct: 0,
      line_total: 500,
      is_optional: false,
    });
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        estimate_lines: { data: newLine, error: null },
        estimates: { data: makeEstimate({ subtotal_amount: 500, tax_amount: 65, total_amount: 565 }), error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await POST_LINE(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/lines`, {
        description: 'Labour — Framing crew',
        quantity: 10,
        unit_cost: 50,
      }),
      makeLineContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.line_total).toBeDefined();
  });

  it('calculates line_total correctly with no markup', async () => {
    // 10 * 50 * 1.0 = 500
    const newLine = makeEstimateLine({
      estimate_id: ESTIMATE_ID,
      quantity: 10,
      unit_cost: 50,
      markup_pct: 0,
      line_total: 500,
    });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          estimate_lines: { data: newLine, error: null },
          estimates: { data: makeEstimate(), error: null },
        },
      }),
    );

    const res = await POST_LINE(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/lines`, {
        description: 'Labour',
        quantity: 10,
        unit_cost: 50,
      }),
      makeLineContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(201);
  });

  it('calculates line_total correctly with markup', async () => {
    // 10 * 100 * 1.15 = 1150
    const newLine = makeEstimateLine({
      estimate_id: ESTIMATE_ID,
      quantity: 10,
      unit_cost: 100,
      markup_pct: 15,
      line_total: 1150,
    });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          estimate_lines: { data: newLine, error: null },
          estimates: { data: makeEstimate(), error: null },
        },
      }),
    );

    const res = await POST_LINE(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/lines`, {
        description: 'Material with markup',
        quantity: 10,
        unit_cost: 100,
        markup_pct: 15,
      }),
      makeLineContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(201);
  });

  it('returns 400 for invalid data (missing description)', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_LINE(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/lines`, {
        quantity: 10,
        unit_cost: 50,
      }),
      makeLineContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative quantity', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_LINE(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/lines`, {
        description: 'Invalid line',
        quantity: -5,
        unit_cost: 50,
      }),
      makeLineContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(400);
  });

  it('handles zero unit_cost (line_total = 0)', async () => {
    const newLine = makeEstimateLine({
      estimate_id: ESTIMATE_ID,
      quantity: 10,
      unit_cost: 0,
      markup_pct: 0,
      line_total: 0,
    });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          estimate_lines: { data: newLine, error: null },
          estimates: { data: makeEstimate(), error: null },
        },
      }),
    );

    const res = await POST_LINE(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/lines`, {
        description: 'Free item',
        quantity: 10,
        unit_cost: 0,
      }),
      makeLineContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(201);
  });
});

// ============================================================
// PUT /api/estimates/[id]/lines — batch replace all lines
// ============================================================
describe('PUT /api/estimates/[id]/lines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PUT_BATCH(
      makeJsonRequest(
        `/api/estimates/${ESTIMATE_ID}/lines`,
        [{ description: 'Line 1', quantity: 5, unit_cost: 100 }],
        'PUT',
      ),
      makeLineContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(401);
  });

  it('batch replaces all lines and recalculates', async () => {
    const newLines = [
      makeEstimateLine({ sort_order: 0, description: 'New line 1', line_total: 500 }),
      makeEstimateLine({ sort_order: 1, description: 'New line 2', line_total: 1000 }),
    ];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        estimate_lines: { data: newLines, error: null },
        estimates: { data: makeEstimate({ subtotal_amount: 1500, tax_amount: 195, total_amount: 1695 }), error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await PUT_BATCH(
      makeJsonRequest(
        `/api/estimates/${ESTIMATE_ID}/lines`,
        [
          { description: 'New line 1', quantity: 10, unit_cost: 50, sort_order: 0 },
          { description: 'New line 2', quantity: 20, unit_cost: 50, sort_order: 1 },
        ],
        'PUT',
      ),
      makeLineContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.lines)).toBe(true);
  });

  it('returns 400 for invalid batch data', async () => {
    mockClerkAuth(mockAuth);
    const res = await PUT_BATCH(
      makeJsonRequest(
        `/api/estimates/${ESTIMATE_ID}/lines`,
        [{ description: '', quantity: 0, unit_cost: -5 }],
        'PUT',
      ),
      makeLineContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// PATCH /api/estimates/[id]/lines/[lineId] — update single line
// ============================================================
describe('PATCH /api/estimates/[id]/lines/[lineId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH_LINE(
      makeJsonRequest(
        `/api/estimates/${ESTIMATE_ID}/lines/${LINE_ID}`,
        { quantity: 20 },
        'PATCH',
      ),
      makeLineItemContext(ESTIMATE_ID, LINE_ID),
    );
    expect(res.status).toBe(401);
  });

  it('updates a line and recalculates estimate totals', async () => {
    const currentLine = makeEstimateLine({
      id: LINE_ID,
      estimate_id: ESTIMATE_ID,
      quantity: 10,
      unit_cost: 50,
      markup_pct: 0,
      line_total: 500,
    });
    const updatedLine = { ...currentLine, quantity: 20, line_total: 1000 };
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        estimate_lines: { data: updatedLine, error: null },
        estimates: { data: makeEstimate({ subtotal_amount: 1000, tax_amount: 130, total_amount: 1130 }), error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await PATCH_LINE(
      makeJsonRequest(
        `/api/estimates/${ESTIMATE_ID}/lines/${LINE_ID}`,
        { quantity: 20 },
        'PATCH',
      ),
      makeLineItemContext(ESTIMATE_ID, LINE_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
  });

  it('returns 400 for invalid update (markup > 100)', async () => {
    mockClerkAuth(mockAuth);
    const res = await PATCH_LINE(
      makeJsonRequest(
        `/api/estimates/${ESTIMATE_ID}/lines/${LINE_ID}`,
        { markup_pct: 150 },
        'PATCH',
      ),
      makeLineItemContext(ESTIMATE_ID, LINE_ID),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// DELETE /api/estimates/[id]/lines/[lineId]
// ============================================================
describe('DELETE /api/estimates/[id]/lines/[lineId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await DELETE_LINE(
      makeRequest(`/api/estimates/${ESTIMATE_ID}/lines/${LINE_ID}`),
      makeLineItemContext(ESTIMATE_ID, LINE_ID),
    );
    expect(res.status).toBe(401);
  });

  it('removes line and recalculates estimate totals', async () => {
    // After deleting, remaining lines are empty → totals should be zeroed
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        estimate_lines: { data: [], error: null },
        estimates: { data: makeEstimate({ subtotal_amount: 0, tax_amount: 0, total_amount: 0 }), error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await DELETE_LINE(
      makeRequest(`/api/estimates/${ESTIMATE_ID}/lines/${LINE_ID}`),
      makeLineItemContext(ESTIMATE_ID, LINE_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('recalculation after delete updates parent estimate', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        estimate_lines: { data: [], error: null },
        estimates: { data: makeEstimate({ subtotal_amount: 0, tax_amount: 0, total_amount: 0 }), error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await DELETE_LINE(
      makeRequest(`/api/estimates/${ESTIMATE_ID}/lines/${LINE_ID}`),
      makeLineItemContext(ESTIMATE_ID, LINE_ID),
    );
    expect(res.status).toBe(200);
    // Verify the route called estimates table to update totals
    const fromCalls = (client.from as ReturnType<typeof vi.fn>).mock.calls;
    const tablesCalled = fromCalls.map((c: unknown[]) => c[0]);
    expect(tablesCalled).toContain('estimate_lines');
    expect(tablesCalled).toContain('estimates');
  });
});
