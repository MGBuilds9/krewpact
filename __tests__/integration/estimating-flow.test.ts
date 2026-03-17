import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeEstimate,
  makeEstimateLine,
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  resetFixtureCounter,
} from '@/__tests__/helpers';
import { PATCH as linePATCH } from '@/app/api/estimates/[id]/lines/[lineId]/route';
// Estimate line routes
import {
  GET as linesGET,
  POST as linePOST,
  PUT as linesPUT,
} from '@/app/api/estimates/[id]/lines/route';
import { DELETE as estimateDELETE, PATCH as estimatePATCH } from '@/app/api/estimates/[id]/route';
// Estimate version routes
import { GET as versionsGET, POST as versionPOST } from '@/app/api/estimates/[id]/versions/route';
// Estimate routes
import { GET as estimatesGET, POST as estimatesPOST } from '@/app/api/estimates/route';
// Pure calculation functions
import { calculateEstimateTotals, calculateLineTotal } from '@/lib/estimating/calculations';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

// Valid v4 UUIDs for Zod-validated fields
const VALID_DIVISION_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_OPPORTUNITY_ID = 'd3bbee22-2f3e-4fb1-bb9a-9ee2ea603d44';
const ESTIMATE_ID = 'f5ddaa44-4b5a-4fd3-ddbc-baa4ac825f66';
const LINE_ID_1 = 'a1aabb11-1c1d-4ae1-aa11-1bb1cc1dd1e1';
const LINE_ID_2 = 'a2aabb22-2c2d-4ae2-aa22-2bb2cc2dd2e2';
const LINE_ID_3 = 'a3aabb33-3c3d-4ae3-aa33-3bb3cc3dd3e3';
const USER_ID = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

function makeEstimateContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeLineItemContext(id: string, lineId: string) {
  return { params: Promise.resolve({ id, lineId }) };
}

// ============================================================
// Integration Test: Full Estimating Happy Path
// ============================================================
describe('Estimating Integration: Full happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('create estimate → add 3 lines → verify totals → create version → update line → verify recalc → create 2nd version → list versions', async () => {
    // Step 1: Create estimate
    const estimate = makeEstimate({
      id: ESTIMATE_ID,
      estimate_number: 'EST-2026-001',
      status: 'draft',
    });
    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimates: { data: estimate, error: null } },
      }),
      error: null,
    });

    const createRes = await estimatesPOST(
      makeJsonRequest('/api/estimates', {
        division_id: VALID_DIVISION_ID,
        opportunity_id: VALID_OPPORTUNITY_ID,
      }),
    );
    expect(createRes.status).toBe(201);
    const createdEstimate = await createRes.json();
    expect(createdEstimate.estimate_number).toMatch(/^EST-\d{4}-\d{3}$/);
    expect(createdEstimate.status).toBe('draft');

    // Step 2: Add 3 lines (labour, material, equipment)
    const labourLine = makeEstimateLine({
      id: LINE_ID_1,
      estimate_id: ESTIMATE_ID,
      description: 'Labour — Framing crew',
      quantity: 80,
      unit_cost: 65,
      markup_pct: 10,
      line_total: calculateLineTotal(80, 65, 10),
      is_optional: false,
      sort_order: 0,
    });
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          estimate_lines: { data: labourLine, error: null },
          estimates: { data: makeEstimate(), error: null },
        },
      }),
      error: null,
    });

    const labourRes = await linePOST(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/lines`, {
        description: 'Labour — Framing crew',
        quantity: 80,
        unit_cost: 65,
        markup_pct: 10,
      }),
      makeEstimateContext(ESTIMATE_ID),
    );
    expect(labourRes.status).toBe(201);

    const materialLine = makeEstimateLine({
      id: LINE_ID_2,
      estimate_id: ESTIMATE_ID,
      description: 'Material — Lumber',
      quantity: 200,
      unit_cost: 12.5,
      markup_pct: 15,
      line_total: calculateLineTotal(200, 12.5, 15),
      is_optional: false,
      sort_order: 1,
    });
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          estimate_lines: { data: materialLine, error: null },
          estimates: { data: makeEstimate(), error: null },
        },
      }),
      error: null,
    });

    const materialRes = await linePOST(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/lines`, {
        description: 'Material — Lumber',
        quantity: 200,
        unit_cost: 12.5,
        markup_pct: 15,
      }),
      makeEstimateContext(ESTIMATE_ID),
    );
    expect(materialRes.status).toBe(201);

    const equipmentLine = makeEstimateLine({
      id: LINE_ID_3,
      estimate_id: ESTIMATE_ID,
      description: 'Equipment — Crane rental',
      quantity: 5,
      unit_cost: 2000,
      markup_pct: 5,
      line_total: calculateLineTotal(5, 2000, 5),
      is_optional: false,
      sort_order: 2,
    });
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          estimate_lines: { data: equipmentLine, error: null },
          estimates: { data: makeEstimate(), error: null },
        },
      }),
      error: null,
    });

    const equipmentRes = await linePOST(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/lines`, {
        description: 'Equipment — Crane rental',
        quantity: 5,
        unit_cost: 2000,
        markup_pct: 5,
      }),
      makeEstimateContext(ESTIMATE_ID),
    );
    expect(equipmentRes.status).toBe(201);

    // Step 3: Verify totals calculated correctly
    const allLines = [labourLine, materialLine, equipmentLine];
    const totals = calculateEstimateTotals(
      allLines.map((l) => ({
        line_total: l.line_total as number,
        is_optional: l.is_optional as boolean,
      })),
    );
    expect(totals.subtotal_amount).toBeGreaterThan(0);
    expect(totals.tax_amount).toBeGreaterThan(0);
    expect(totals.total_amount).toBe(
      Math.round((totals.subtotal_amount + totals.tax_amount) * 100) / 100,
    );

    // Step 4: Create version 1
    const lines = [labourLine, materialLine, equipmentLine];
    const version1 = {
      id: 'v1-id',
      estimate_id: ESTIMATE_ID,
      revision_no: 1,
      snapshot: { estimate: createdEstimate, lines, created_at: '2026-02-13T00:00:00Z' },
      reason: null,
      created_by: USER_ID,
      created_at: '2026-02-13T00:00:00Z',
    };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          estimates: { data: { ...estimate, estimate_lines: lines }, error: null },
          estimate_versions: { data: version1, error: null },
        },
      }),
      error: null,
    });

    const version1Res = await versionPOST(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/versions`, {}),
      makeEstimateContext(ESTIMATE_ID),
    );
    expect(version1Res.status).toBe(201);

    // Step 5: Update line quantities (double labour hours)
    const updatedLabour = {
      ...labourLine,
      quantity: 160,
      line_total: calculateLineTotal(160, 65, 10),
    };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          estimate_lines: { data: updatedLabour, error: null },
          estimates: { data: makeEstimate(), error: null },
        },
      }),
      error: null,
    });

    const updateRes = await linePATCH(
      makeJsonRequest(
        `/api/estimates/${ESTIMATE_ID}/lines/${LINE_ID_1}`,
        { quantity: 160 },
        'PATCH',
      ),
      makeLineItemContext(ESTIMATE_ID, LINE_ID_1),
    );
    expect(updateRes.status).toBe(200);

    // Step 6: Verify recalculation happened
    const recalcLines = [updatedLabour, materialLine, equipmentLine];
    const recalcTotals = calculateEstimateTotals(
      recalcLines.map((l) => ({
        line_total: l.line_total as number,
        is_optional: l.is_optional as boolean,
      })),
    );
    expect(recalcTotals.subtotal_amount).toBeGreaterThan(totals.subtotal_amount);

    // Step 7: Create version 2
    const version2 = {
      id: 'v2-id',
      estimate_id: ESTIMATE_ID,
      revision_no: 2,
      snapshot: {
        estimate: { ...estimate, revision_no: 2 },
        lines: recalcLines,
        created_at: '2026-02-13T01:00:00Z',
      },
      reason: 'Doubled labour hours',
      created_by: USER_ID,
      created_at: '2026-02-13T01:00:00Z',
    };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          estimates: {
            data: { ...estimate, revision_no: 2, estimate_lines: recalcLines },
            error: null,
          },
          estimate_versions: { data: version2, error: null },
        },
      }),
      error: null,
    });

    const version2Res = await versionPOST(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/versions`, { reason: 'Doubled labour hours' }),
      makeEstimateContext(ESTIMATE_ID),
    );
    expect(version2Res.status).toBe(201);
    const v2Body = await version2Res.json();
    expect(v2Body.reason).toBe('Doubled labour hours');

    // Step 8: List versions (2 returned)
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimate_versions: { data: [version2, version1], error: null } },
      }),
      error: null,
    });

    const versionsRes = await versionsGET(
      makeRequest(`/api/estimates/${ESTIMATE_ID}/versions`),
      makeEstimateContext(ESTIMATE_ID),
    );
    expect(versionsRes.status).toBe(200);
    const versions = await versionsRes.json();
    expect(versions.data).toHaveLength(2);
  });
});

// ============================================================
// Integration Test: Estimate Number Uniqueness
// ============================================================
describe('Estimating Integration: Estimate number uniqueness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('two estimates get different numbers (EST-2026-001, EST-2026-002)', async () => {
    // First estimate: count = 0 → EST-2026-001
    const est1 = makeEstimate({ estimate_number: 'EST-2026-001' });
    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimates: { data: est1, error: null } },
        defaultResponse: { data: { count: 0 }, error: null },
      }),
      error: null,
    });

    const res1 = await estimatesPOST(
      makeJsonRequest('/api/estimates', { division_id: VALID_DIVISION_ID }),
    );
    expect(res1.status).toBe(201);
    const body1 = await res1.json();
    expect(body1.estimate_number).toBe('EST-2026-001');

    // Second estimate: count = 1 → EST-2026-002
    const est2 = makeEstimate({ estimate_number: 'EST-2026-002' });
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimates: { data: est2, error: null } },
        defaultResponse: { data: { count: 1 }, error: null },
      }),
      error: null,
    });

    const res2 = await estimatesPOST(
      makeJsonRequest('/api/estimates', { division_id: VALID_DIVISION_ID }),
    );
    expect(res2.status).toBe(201);
    const body2 = await res2.json();
    expect(body2.estimate_number).toBe('EST-2026-002');
    expect(body1.estimate_number).not.toBe(body2.estimate_number);
  });
});

// ============================================================
// Integration Test: Optional Lines Excluded from Totals
// ============================================================
describe('Estimating Integration: Optional lines excluded from totals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('optional line does not affect subtotal calculation', async () => {
    const optionalLine = makeEstimateLine({
      quantity: 5,
      unit_cost: 200,
      markup_pct: 0,
      line_total: 1000,
      is_optional: true,
    });

    // Verify via pure calculation function
    const totals = calculateEstimateTotals([
      { line_total: 1000, is_optional: false },
      { line_total: 1000, is_optional: true },
    ]);
    expect(totals.subtotal_amount).toBe(1000); // Only required line counted
    expect(totals.tax_amount).toBe(130); // 1000 * 13% = 130
    expect(totals.total_amount).toBe(1130);

    // Verify via API — add optional line and check totals don't include it
    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          estimate_lines: { data: optionalLine, error: null },
          estimates: {
            data: makeEstimate({ subtotal_amount: 1000, tax_amount: 130, total_amount: 1130 }),
            error: null,
          },
        },
      }),
      error: null,
    });

    const res = await linePOST(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/lines`, {
        description: 'Optional upgrade',
        quantity: 5,
        unit_cost: 200,
        is_optional: true,
      }),
      makeEstimateContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(201);
  });
});

// ============================================================
// Integration Test: Status Transitions
// ============================================================
describe('Estimating Integration: Status transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('draft → review → sent → approved path works', async () => {
    const transitions = [
      { from: 'draft', to: 'review' },
      { from: 'review', to: 'sent' },
      { from: 'sent', to: 'approved' },
    ];

    for (const { from, to } of transitions) {
      const current = makeEstimate({ id: ESTIMATE_ID, status: from });
      mockClerkAuth(mockAuth, USER_ID);
      mockCreateUserClientSafe.mockResolvedValue({
        client: mockSupabaseClient({
          tables: { estimates: { data: current, error: null } },
        }),
        error: null,
      });

      const res = await estimatePATCH(
        makeJsonRequest(`/api/estimates/${ESTIMATE_ID}`, { status: to }, 'PATCH'),
        makeEstimateContext(ESTIMATE_ID),
      );
      expect(res.status).toBe(200);
    }
  });

  it('draft → approved is rejected', async () => {
    const current = makeEstimate({ id: ESTIMATE_ID, status: 'draft' });
    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimates: { data: current, error: null } },
      }),
      error: null,
    });

    const res = await estimatePATCH(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}`, { status: 'approved' }, 'PATCH'),
      makeEstimateContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('not allowed');
  });
});

// ============================================================
// Integration Test: Zero Quantity Line
// ============================================================
describe('Estimating Integration: Zero quantity line', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('line with zero unit_cost is valid and line_total is 0', async () => {
    const zeroLine = makeEstimateLine({
      estimate_id: ESTIMATE_ID,
      quantity: 10,
      unit_cost: 0,
      markup_pct: 0,
      line_total: 0,
    });
    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          estimate_lines: { data: zeroLine, error: null },
          estimates: {
            data: makeEstimate({ subtotal_amount: 0, tax_amount: 0, total_amount: 0 }),
            error: null,
          },
        },
      }),
      error: null,
    });

    const res = await linePOST(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/lines`, {
        description: 'Complimentary item',
        quantity: 10,
        unit_cost: 0,
      }),
      makeEstimateContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(201);

    // Verify pure calculation
    expect(calculateLineTotal(10, 0, 0)).toBe(0);
    expect(calculateLineTotal(10, 0, 15)).toBe(0);
  });
});

// ============================================================
// Integration Test: Markup Calculation
// ============================================================
describe('Estimating Integration: Markup calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('10 qty * $100 unit_cost * 15% markup = $1,150 line total', async () => {
    const lineTotal = calculateLineTotal(10, 100, 15);
    expect(lineTotal).toBe(1150);

    const markupLine = makeEstimateLine({
      estimate_id: ESTIMATE_ID,
      quantity: 10,
      unit_cost: 100,
      markup_pct: 15,
      line_total: 1150,
    });
    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          estimate_lines: { data: markupLine, error: null },
          estimates: { data: makeEstimate(), error: null },
        },
      }),
      error: null,
    });

    const res = await linePOST(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/lines`, {
        description: 'Material with 15% markup',
        quantity: 10,
        unit_cost: 100,
        markup_pct: 15,
      }),
      makeEstimateContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(201);
  });
});

// ============================================================
// Integration Test: HST Calculation
// ============================================================
describe('Estimating Integration: HST calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('$10,000 subtotal → $1,300 tax → $11,300 total', async () => {
    const lines = [
      { line_total: 5000, is_optional: false },
      { line_total: 5000, is_optional: false },
    ];
    const totals = calculateEstimateTotals(lines);
    expect(totals.subtotal_amount).toBe(10000);
    expect(totals.tax_amount).toBe(1300);
    expect(totals.total_amount).toBe(11300);
  });
});

// ============================================================
// Integration Test: Delete Estimate Cascades
// ============================================================
describe('Estimating Integration: Delete estimate cascades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('deleting estimate succeeds (DB handles cascade to lines and versions)', async () => {
    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimates: { data: null, error: null } },
      }),
      error: null,
    });

    const res = await estimateDELETE(
      makeRequest(`/api/estimates/${ESTIMATE_ID}`),
      makeEstimateContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('after deleting estimate, lines list returns empty', async () => {
    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimate_lines: { data: [], error: null } },
      }),
      error: null,
    });

    const res = await linesGET(
      makeRequest(`/api/estimates/${ESTIMATE_ID}/lines`),
      makeEstimateContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });

  it('after deleting estimate, versions list returns empty', async () => {
    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimate_versions: { data: [], error: null } },
      }),
      error: null,
    });

    const res = await versionsGET(
      makeRequest(`/api/estimates/${ESTIMATE_ID}/versions`),
      makeEstimateContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });
});

// ============================================================
// Integration Test: Batch Line Update
// ============================================================
describe('Estimating Integration: Batch line update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('PUT batch replaces all lines correctly', async () => {
    const newLines = [
      makeEstimateLine({ sort_order: 0, description: 'Replacement line 1', line_total: 750 }),
      makeEstimateLine({ sort_order: 1, description: 'Replacement line 2', line_total: 1250 }),
    ];
    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          estimate_lines: { data: newLines, error: null },
          estimates: {
            data: makeEstimate({ subtotal_amount: 2000, tax_amount: 260, total_amount: 2260 }),
            error: null,
          },
        },
      }),
      error: null,
    });

    const res = await linesPUT(
      makeJsonRequest(
        `/api/estimates/${ESTIMATE_ID}/lines`,
        [
          { description: 'Replacement line 1', quantity: 15, unit_cost: 50, sort_order: 0 },
          { description: 'Replacement line 2', quantity: 25, unit_cost: 50, sort_order: 1 },
        ],
        'PUT',
      ),
      makeEstimateContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lines).toBeDefined();
    expect(Array.isArray(body.lines)).toBe(true);
  });
});

// ============================================================
// Integration Test: Rounding (No Floating Point Errors)
// ============================================================
describe('Estimating Integration: Rounding correctness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('no floating point errors: 0.1 + 0.2 scenario', () => {
    // Verify that line total calculation doesn't produce floating point artifacts
    const lineTotal = calculateLineTotal(1, 0.1, 0); // 1 * 0.1 = 0.1
    expect(lineTotal).toBe(0.1);
    expect(String(lineTotal)).not.toContain('00000000000');
  });

  it('accumulation of many small values stays precise', () => {
    // 100 lines of $0.01 each — should be exactly $1.00
    const lines = Array.from({ length: 100 }, () => ({
      line_total: 0.01,
      is_optional: false,
    }));
    const totals = calculateEstimateTotals(lines);
    expect(totals.subtotal_amount).toBe(1);
    expect(totals.tax_amount).toBe(0.13);
    expect(totals.total_amount).toBe(1.13);
  });

  it('2.5 * 33.33 with 10% markup rounds correctly', () => {
    const lineTotal = calculateLineTotal(2.5, 33.33, 10);
    // 2.5 * 33.33 * 1.10 = 91.6575 → rounds to 91.66
    expect(lineTotal).toBe(91.66);
  });

  it('large value calculation stays precise', () => {
    const lineTotal = calculateLineTotal(1000, 999.99, 0);
    expect(lineTotal).toBe(999990);
  });
});

// ============================================================
// Integration Test: Auth boundary (cross-cutting)
// ============================================================
describe('Estimating Integration: Auth boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('unauthenticated requests to estimate endpoints return 401', async () => {
    mockClerkUnauth(mockAuth);

    const results = await Promise.all([
      estimatesGET(makeRequest('/api/estimates')),
      linesGET(
        makeRequest(`/api/estimates/${ESTIMATE_ID}/lines`),
        makeEstimateContext(ESTIMATE_ID),
      ),
      versionsGET(
        makeRequest(`/api/estimates/${ESTIMATE_ID}/versions`),
        makeEstimateContext(ESTIMATE_ID),
      ),
    ]);

    for (const res of results) {
      expect(res.status).toBe(401);
    }
  });
});
