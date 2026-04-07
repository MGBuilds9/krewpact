import { describe, expect, it } from 'vitest';

import { formatCurrency, formatCurrencyCompact } from '@/lib/format/currency';

describe('formatCurrency (full precision)', () => {
  it('formats round millions with no decimals', () => {
    expect(formatCurrency(4_000_000)).toBe('$4,000,000');
  });

  it('formats round thousands with no decimals', () => {
    expect(formatCurrency(42_500)).toBe('$42,500');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('rounds away the cents', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235');
  });

  it('formats negative values', () => {
    // en-CA uses -$1,234, not ($1,234)
    expect(formatCurrency(-1234)).toBe('-$1,234');
  });

  it('defaults to CAD and shows the bare $ sigil in en-CA', () => {
    // en-CA collapses CAD to $ (no CA$ prefix).
    expect(formatCurrency(100)).toMatch(/^\$/);
  });

  it('accepts an explicit USD currency code', () => {
    // en-CA renders USD as US$.
    expect(formatCurrency(100, 'USD')).toContain('US$');
  });
});

describe('formatCurrencyCompact', () => {
  it('renders a round 4M value as $4M, not $4000k', () => {
    // Regression guard for ISSUE-004 — the old formatter displayed
    // $4,000,000 as the lie "$4000k".
    const out = formatCurrencyCompact(4_000_000);
    expect(out).toBe('$4M');
    expect(out).not.toContain('k');
    expect(out).not.toContain('000');
  });

  it('renders $1.25M with one decimal', () => {
    expect(formatCurrencyCompact(1_250_000)).toBe('$1.3M');
  });

  it('renders $42.5K for forty-two-and-a-half thousand', () => {
    expect(formatCurrencyCompact(42_500)).toBe('$42.5K');
  });

  it('renders zero as $0', () => {
    expect(formatCurrencyCompact(0)).toBe('$0');
  });

  it('handles values in the billions without losing the B suffix', () => {
    expect(formatCurrencyCompact(2_300_000_000)).toBe('$2.3B');
  });

  it('formats negative compact values', () => {
    expect(formatCurrencyCompact(-1_000_000)).toBe('-$1M');
  });

  it('never emits the broken "Xk" lowercase-thousands notation', () => {
    // en-CA uses uppercase K in compact notation. If this assertion ever
    // fails, investigate before "fixing" — it may mean the ICU data
    // changed and the old inline formatter's bug has resurrected.
    const outputs = [100, 1_000, 10_000, 100_000, 1_000_000].map((n) => formatCurrencyCompact(n));
    for (const out of outputs) {
      expect(out).not.toMatch(/\bk\b/);
    }
  });
});
