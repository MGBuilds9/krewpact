import { describe, expect, it } from 'vitest';

import {
  calculateEstimateTotals,
  calculateLineTotal,
  generateEstimateNumber,
} from '@/lib/estimating/calculations';

describe('calculateLineTotal', () => {
  it('calculates basic line total without markup', () => {
    expect(calculateLineTotal(10, 50, 0)).toBe(500);
  });

  it('applies markup percentage correctly', () => {
    // 10 * 50 * 1.15 = 575
    expect(calculateLineTotal(10, 50, 15)).toBe(575);
  });

  it('returns 0 when quantity is 0', () => {
    expect(calculateLineTotal(0, 50, 10)).toBe(0);
  });

  it('returns 0 when unit cost is 0', () => {
    expect(calculateLineTotal(1, 0, 10)).toBe(0);
  });

  it('rounds to 2 decimal places for fractional results', () => {
    // 2.5 * 33.33 * 1.10 = 91.6575 → 91.66
    const result = calculateLineTotal(2.5, 33.33, 10);
    expect(result).toBe(91.66);
    // Verify no floating point issues
    expect(result.toString()).not.toContain('000000');
  });

  it('handles 100% markup (doubles the line total)', () => {
    // 5 * 100 * 2.0 = 1000
    expect(calculateLineTotal(5, 100, 100)).toBe(1000);
  });

  it('handles very small fractional quantities', () => {
    // 0.0001 * 99999.99 * 1.0 = 9.999999 → 10.00
    const result = calculateLineTotal(0.0001, 99999.99, 0);
    expect(result).toBe(10);
  });

  it('handles large numbers without overflow', () => {
    // 10000 * 9999.99 * 1.0 = 99999900
    const result = calculateLineTotal(10000, 9999.99, 0);
    expect(result).toBe(99999900);
  });
});

describe('calculateEstimateTotals', () => {
  it('sums line totals correctly for multiple lines', () => {
    const lines = [
      { line_total: 500, is_optional: false },
      { line_total: 300, is_optional: false },
      { line_total: 200, is_optional: false },
    ];
    const result = calculateEstimateTotals(lines);
    expect(result.subtotal_amount).toBe(1000);
  });

  it('applies 13% HST for tax calculation', () => {
    const lines = [{ line_total: 10000, is_optional: false }];
    const result = calculateEstimateTotals(lines);
    expect(result.subtotal_amount).toBe(10000);
    expect(result.tax_amount).toBe(1300);
    expect(result.total_amount).toBe(11300);
  });

  it('excludes optional lines from subtotal', () => {
    const lines = [
      { line_total: 1000, is_optional: false },
      { line_total: 500, is_optional: true },
      { line_total: 200, is_optional: false },
    ];
    const result = calculateEstimateTotals(lines);
    // Only non-optional: 1000 + 200 = 1200
    expect(result.subtotal_amount).toBe(1200);
    expect(result.tax_amount).toBe(156); // 1200 * 0.13 = 156
    expect(result.total_amount).toBe(1356);
  });

  it('returns zeros for empty lines array', () => {
    const result = calculateEstimateTotals([]);
    expect(result.subtotal_amount).toBe(0);
    expect(result.tax_amount).toBe(0);
    expect(result.total_amount).toBe(0);
  });

  it('handles all optional lines (subtotal is 0)', () => {
    const lines = [
      { line_total: 500, is_optional: true },
      { line_total: 300, is_optional: true },
    ];
    const result = calculateEstimateTotals(lines);
    expect(result.subtotal_amount).toBe(0);
    expect(result.tax_amount).toBe(0);
    expect(result.total_amount).toBe(0);
  });

  it('rounds tax to 2 decimal places', () => {
    // subtotal = 999.99, tax = 999.99 * 0.13 = 129.9987 → 130.00
    const lines = [{ line_total: 999.99, is_optional: false }];
    const result = calculateEstimateTotals(lines);
    expect(result.subtotal_amount).toBe(999.99);
    expect(result.tax_amount).toBe(130);
    expect(result.total_amount).toBe(1129.99);
  });

  it('handles large number of lines (stress test)', () => {
    const lines = Array.from({ length: 100 }, () => ({
      line_total: 100,
      is_optional: false,
    }));
    const result = calculateEstimateTotals(lines);
    expect(result.subtotal_amount).toBe(10000);
    expect(result.tax_amount).toBe(1300);
    expect(result.total_amount).toBe(11300);
  });

  it('avoids floating point errors', () => {
    // 0.1 + 0.2 should not produce 0.30000000000000004
    const lines = [
      { line_total: 0.1, is_optional: false },
      { line_total: 0.2, is_optional: false },
    ];
    const result = calculateEstimateTotals(lines);
    expect(result.subtotal_amount).toBe(0.3);
    // 0.3 * 0.13 = 0.039 → 0.04
    expect(result.tax_amount).toBe(0.04);
    expect(result.total_amount).toBe(0.34);
  });
});

describe('generateEstimateNumber', () => {
  it('generates EST-YYYY-001 for first estimate (count=0)', () => {
    expect(generateEstimateNumber(0)).toBe('EST-2026-001');
  });

  it('generates EST-YYYY-043 for count=42', () => {
    expect(generateEstimateNumber(42)).toBe('EST-2026-043');
  });

  it('pads to 3 digits', () => {
    expect(generateEstimateNumber(0)).toMatch(/EST-\d{4}-001/);
    expect(generateEstimateNumber(9)).toMatch(/EST-\d{4}-010/);
    expect(generateEstimateNumber(99)).toMatch(/EST-\d{4}-100/);
  });

  it('handles large counts (no upper limit)', () => {
    expect(generateEstimateNumber(999)).toBe('EST-2026-1000');
  });

  it('uses the current year', () => {
    const currentYear = new Date().getFullYear();
    const result = generateEstimateNumber(0);
    expect(result).toContain(`EST-${currentYear}-`);
  });
});
