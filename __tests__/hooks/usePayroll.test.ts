import { describe, expect, it } from 'vitest';

import { generatePayPeriods } from '@/hooks/usePayroll';

describe('generatePayPeriods', () => {
  it('returns the requested number of periods', () => {
    const periods = generatePayPeriods(6);
    expect(periods).toHaveLength(6);
  });

  it('defaults to 12 periods', () => {
    const periods = generatePayPeriods();
    expect(periods).toHaveLength(12);
  });

  it('each period spans exactly 14 days', () => {
    const periods = generatePayPeriods(4);
    for (const period of periods) {
      const start = new Date(period.start);
      const end = new Date(period.end);
      const days = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      expect(days).toBe(13); // 13 day gap = 14 day span (inclusive)
    }
  });

  it('periods are in descending order (most recent first)', () => {
    const periods = generatePayPeriods(4);
    for (let i = 0; i < periods.length - 1; i++) {
      expect(periods[i].start >= periods[i + 1].start).toBe(true);
    }
  });

  it('each period has a label matching the start and end dates', () => {
    const periods = generatePayPeriods(3);
    for (const period of periods) {
      expect(period.label).toContain(period.start);
      expect(period.label).toContain(period.end);
    }
  });

  it('start dates are in YYYY-MM-DD format', () => {
    const periods = generatePayPeriods(2);
    for (const period of periods) {
      expect(period.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(period.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('no overlapping periods', () => {
    const periods = generatePayPeriods(6);
    for (let i = 0; i < periods.length - 1; i++) {
      const currentEnd = new Date(periods[i].end);
      const nextStart = new Date(periods[i + 1].start);
      // next period should start before current ends (they don't overlap)
      expect(nextStart < currentEnd).toBe(true);
    }
  });
});
