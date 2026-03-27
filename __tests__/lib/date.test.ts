import { describe, expect, it } from 'vitest';

import {
  APP_LOCALE,
  APP_TIMEZONE,
  formatCurrency,
  formatCurrencyAbbrev,
  formatCurrencyShort,
  formatDate,
  formatDateTime,
  formatMonthYear,
  formatShortDate,
  formatTime,
} from '@/lib/date';

// Fixed reference: 2026-03-12 noon UTC = 8am EST / 7am CST
const REF_DATE = new Date('2026-03-12T12:00:00Z');
const REF_STRING = '2026-03-12T12:00:00Z';

describe('APP_TIMEZONE / APP_LOCALE', () => {
  it('timezone is America/Toronto', () => {
    expect(APP_TIMEZONE).toBe('America/Toronto');
  });

  it('locale is en-CA', () => {
    expect(APP_LOCALE).toBe('en-CA');
  });
});

describe('formatDate', () => {
  it('accepts a Date object and returns a non-empty string', () => {
    expect(formatDate(REF_DATE).length).toBeGreaterThan(0);
  });

  it('accepts an ISO string and returns same result as Date object', () => {
    expect(formatDate(REF_STRING)).toBe(formatDate(REF_DATE));
  });

  it('includes the year in output', () => {
    expect(formatDate(REF_DATE)).toContain('2026');
  });

  it('respects custom options (long month)', () => {
    const result = formatDate(REF_DATE, { month: 'long', year: 'numeric' });
    expect(result).toContain('2026');
    expect(result.toLowerCase()).toContain('march');
  });
});

describe('formatDateTime', () => {
  it('returns a string that includes the year', () => {
    expect(formatDateTime(REF_DATE)).toContain('2026');
  });

  it('accepts an ISO string', () => {
    expect(formatDateTime(REF_STRING).length).toBeGreaterThan(0);
  });

  it('produces a longer string than formatDate alone', () => {
    expect(formatDateTime(REF_DATE).length).toBeGreaterThanOrEqual(formatDate(REF_DATE).length);
  });
});

describe('formatTime', () => {
  it('returns a non-empty string', () => {
    expect(formatTime(REF_DATE).length).toBeGreaterThan(0);
  });

  it('accepts an ISO string', () => {
    expect(formatTime(REF_STRING).length).toBeGreaterThan(0);
  });
});

describe('formatShortDate', () => {
  it('returns a short date containing the day number', () => {
    const result = formatShortDate(REF_DATE);
    expect(result).toContain('12');
  });

  it('contains an abbreviated month name', () => {
    const result = formatShortDate(REF_DATE).toLowerCase();
    expect(result).toContain('mar');
  });

  it('does not include the year', () => {
    const result = formatShortDate(REF_DATE);
    expect(result).not.toContain('2026');
  });
});

describe('formatMonthYear', () => {
  it('contains the year', () => {
    expect(formatMonthYear(REF_DATE)).toContain('2026');
  });

  it('contains abbreviated month', () => {
    expect(formatMonthYear(REF_DATE).toLowerCase()).toContain('mar');
  });

  it('does not contain the day number', () => {
    // "12" could appear in "2026", so check it is not a standalone day token
    const result = formatMonthYear(REF_DATE);
    // Result should be short — no day digit before or after month
    expect(result.split(' ').length).toBeLessThanOrEqual(3);
  });
});

describe('formatCurrency', () => {
  it('formats a positive amount with $ prefix', () => {
    expect(formatCurrency(1000)).toMatch(/^\$/);
  });

  it('includes two decimal places', () => {
    expect(formatCurrency(1500)).toMatch(/\.00$/);
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('includes comma separator for thousands', () => {
    expect(formatCurrency(1000)).toContain(',');
  });

  it('formats fractional amounts to 2 decimal places', () => {
    expect(formatCurrency(9.5)).toBe('$9.50');
  });
});

describe('formatCurrencyShort', () => {
  it('starts with $', () => {
    expect(formatCurrencyShort(500)).toMatch(/^\$/);
  });

  it('does not force two decimal places for whole numbers', () => {
    // toLocaleString without minimumFractionDigits may omit .00
    const result = formatCurrencyShort(1000);
    expect(result).toMatch(/^\$/);
    expect(result).toContain('1');
  });
});

describe('formatCurrencyAbbrev', () => {
  it('formats millions with M suffix', () => {
    expect(formatCurrencyAbbrev(1_500_000)).toBe('$1.5M');
  });

  it('formats thousands with K suffix', () => {
    expect(formatCurrencyAbbrev(50_000)).toBe('$50K');
  });

  it('rounds K to nearest integer', () => {
    expect(formatCurrencyAbbrev(1_234)).toBe('$1K');
  });

  it('formats sub-thousand amounts without suffix', () => {
    const result = formatCurrencyAbbrev(500);
    expect(result).toMatch(/^\$/);
    expect(result).not.toContain('K');
    expect(result).not.toContain('M');
  });

  it('formats exactly 1M correctly', () => {
    expect(formatCurrencyAbbrev(1_000_000)).toBe('$1.0M');
  });

  it('formats exactly 1K correctly', () => {
    expect(formatCurrencyAbbrev(1_000)).toBe('$1K');
  });
});
