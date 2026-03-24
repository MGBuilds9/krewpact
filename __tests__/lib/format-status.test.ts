import { describe, expect, it } from 'vitest';

import { formatStatus } from '@/lib/format-status';

describe('formatStatus', () => {
  it('converts snake_case to Title Case', () => {
    expect(formatStatus('in_progress')).toBe('In Progress');
  });
  it('converts single word', () => {
    expect(formatStatus('active')).toBe('Active');
  });
  it('handles multi-word enums', () => {
    expect(formatStatus('awaiting_signature')).toBe('Awaiting Signature');
  });
  it('returns em dash for null', () => {
    expect(formatStatus(null)).toBe('\u2014');
  });
  it('returns em dash for undefined', () => {
    expect(formatStatus(undefined)).toBe('\u2014');
  });
});
