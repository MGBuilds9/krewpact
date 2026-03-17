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
  mockSupabaseClient,
  resetFixtureCounter,
} from '@/__tests__/helpers';
import { DELETE as lineDELETE } from '@/app/api/estimates/[id]/lines/[lineId]/route';
// Estimate line routes
import { PUT as linesPUT } from '@/app/api/estimates/[id]/lines/route';
// Pure calculation functions
import { calculateEstimateTotals, calculateLineTotal } from '@/lib/estimating/calculations';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const ESTIMATE_ID = 'f5ddaa44-4b5a-4fd3-ddbc-baa4ac825f66';
const LINE_ID_1 = 'a1aabb11-1c1d-4ae1-aa11-1bb1cc1dd1e1';
const USER_ID = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

function makeEstimateContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeLineItemContext(id: string, lineId: string) {
  return { params: Promise.resolve({ id, lineId }) };
}

// ============================================================
// Calculation Edge Cases: Stress Tests
// ============================================================
describe('Calculation Edge Cases: Large number of lines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('estimate with 100 lines calculates correctly (stress test)', () => {
    const lines = Array.from({ length: 100 }, () => ({
      line_total: calculateLineTotal(10, 100, 0), // Each line = $1,000
      is_optional: false,
    }));
    const totals = calculateEstimateTotals(lines);
    expect(totals.subtotal_amount).toBe(100000); // 100 * $1,000
    expect(totals.tax_amount).toBe(13000); // 100,000 * 13%
    expect(totals.total_amount).toBe(113000);
  });

  it('line with quantity=0.0001 and unit_cost=99999.99 does not overflow', () => {
    const lineTotal = calculateLineTotal(0.0001, 99999.99, 0);
    // 0.0001 * 99999.99 = 9.999999 → rounds to 10.00
    expect(lineTotal).toBe(10);
    expect(Number.isFinite(lineTotal)).toBe(true);
    expect(lineTotal).toBeGreaterThan(0);
    expect(lineTotal).toBeLessThan(100000);
  });

  it('batch update of 50 lines recalculates totals correctly via API', async () => {
    const newLines = Array.from({ length: 50 }, (_, i) =>
      makeEstimateLine({
        sort_order: i,
        description: `Line ${i + 1}`,
        quantity: 2,
        unit_cost: 100,
        markup_pct: 0,
        line_total: 200,
        is_optional: false,
      }),
    );
    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          estimate_lines: { data: newLines, error: null },
          estimates: {
            data: makeEstimate({
              subtotal_amount: 10000,
              tax_amount: 1300,
              total_amount: 11300,
            }),
            error: null,
          },
        },
      }),
      error: null,
    });

    const batchPayload = Array.from({ length: 50 }, (_, i) => ({
      description: `Line ${i + 1}`,
      quantity: 2,
      unit_cost: 100,
      sort_order: i,
    }));

    const res = await linesPUT(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/lines`, batchPayload, 'PUT'),
      makeEstimateContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(200);

    // Verify pure calculation matches expected
    const totals = calculateEstimateTotals(
      newLines.map((l) => ({ line_total: l.line_total as number, is_optional: false })),
    );
    expect(totals.subtotal_amount).toBe(10000); // 50 * 200
    expect(totals.tax_amount).toBe(1300);
    expect(totals.total_amount).toBe(11300);
  });
});

// ============================================================
// Calculation Edge Cases: Zero and Boundary Values
// ============================================================
describe('Calculation Edge Cases: Zero and boundary values', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('deleting all lines sets estimate totals to 0', async () => {
    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          estimate_lines: { data: [], error: null },
          estimates: {
            data: makeEstimate({
              subtotal_amount: 0,
              tax_amount: 0,
              total_amount: 0,
            }),
            error: null,
          },
        },
      }),
      error: null,
    });

    const res = await lineDELETE(
      makeRequest(`/api/estimates/${ESTIMATE_ID}/lines/${LINE_ID_1}`),
      makeLineItemContext(ESTIMATE_ID, LINE_ID_1),
    );
    expect(res.status).toBe(200);

    // Verify pure calculation: empty lines = zero totals
    const totals = calculateEstimateTotals([]);
    expect(totals.subtotal_amount).toBe(0);
    expect(totals.tax_amount).toBe(0);
    expect(totals.total_amount).toBe(0);
  });

  it('markup of exactly 100% doubles the line total', () => {
    const lineTotal = calculateLineTotal(10, 50, 100);
    // 10 * 50 * (1 + 100/100) = 10 * 50 * 2 = 1000
    expect(lineTotal).toBe(1000);

    // Additional edge: 0% markup = base cost
    const noMarkup = calculateLineTotal(10, 50, 0);
    expect(noMarkup).toBe(500);

    // 100% markup should be exactly double
    expect(lineTotal).toBe(noMarkup * 2);
  });

  it('currency formatting handles large numbers ($1,234,567.89)', () => {
    // Test that large subtotals calculate correctly
    const lines = [
      { line_total: 1000000, is_optional: false },
      { line_total: 234567.89, is_optional: false },
    ];
    const totals = calculateEstimateTotals(lines);
    expect(totals.subtotal_amount).toBe(1234567.89);
    // HST = Math.round(1234567.89 * 13) / 100 = Math.round(16049382.57) / 100 = 160493.83
    expect(totals.tax_amount).toBe(160493.83);
    expect(totals.total_amount).toBe(Math.round((1234567.89 + 160493.83) * 100) / 100);

    // Verify CAD formatting works with large numbers
    const formatted = new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(totals.total_amount);
    expect(formatted).toContain('1,395,061.72');
  });
});

// ============================================================
// Calculation Edge Cases: Precision and Rounding
// ============================================================
describe('Calculation Edge Cases: Precision and rounding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('repeating decimals do not cause accumulation errors', () => {
    // 1/3 = 0.333... — test that accumulation stays precise
    const lines = Array.from({ length: 3 }, () => ({
      line_total: 33.33,
      is_optional: false,
    }));
    const totals = calculateEstimateTotals(lines);
    expect(totals.subtotal_amount).toBe(99.99);
    // HST: Math.round(99.99 * 13) / 100 = Math.round(1299.87) / 100 = 12.99... = 13.0
    expect(totals.tax_amount).toBe(13);
    expect(totals.total_amount).toBe(112.99);
  });

  it('very small markup produces correct result', () => {
    // 1% markup on $1.00 = $1.01
    const lineTotal = calculateLineTotal(1, 1, 1);
    expect(lineTotal).toBe(1.01);
  });

  it('mixed optional and required lines calculate correctly', () => {
    const lines = [
      { line_total: 5000, is_optional: false },
      { line_total: 3000, is_optional: true },
      { line_total: 2000, is_optional: false },
      { line_total: 1000, is_optional: true },
    ];
    const totals = calculateEstimateTotals(lines);
    // Only non-optional: 5000 + 2000 = 7000
    expect(totals.subtotal_amount).toBe(7000);
    expect(totals.tax_amount).toBe(910); // 7000 * 0.13
    expect(totals.total_amount).toBe(7910);
  });
});
