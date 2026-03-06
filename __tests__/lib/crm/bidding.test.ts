import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  getAvailableTransitions,
  getDeadlineAlert,
  getStatusColor,
  getSourceLabel,
} from '@/lib/crm/bidding';

describe('isValidTransition', () => {
  it('allows new → reviewing', () => {
    expect(isValidTransition('new', 'reviewing')).toBe(true);
  });

  it('allows new → expired', () => {
    expect(isValidTransition('new', 'expired')).toBe(true);
  });

  it('blocks new → won', () => {
    expect(isValidTransition('new', 'won')).toBe(false);
  });

  it('blocks won → anything', () => {
    expect(isValidTransition('won', 'reviewing')).toBe(false);
    expect(isValidTransition('won', 'lost')).toBe(false);
  });

  it('allows submitted → won', () => {
    expect(isValidTransition('submitted', 'won')).toBe(true);
  });

  it('allows submitted → lost', () => {
    expect(isValidTransition('submitted', 'lost')).toBe(true);
  });

  it('allows reviewing → bidding', () => {
    expect(isValidTransition('reviewing', 'bidding')).toBe(true);
  });

  it('allows bidding → submitted', () => {
    expect(isValidTransition('bidding', 'submitted')).toBe(true);
  });
});

describe('getAvailableTransitions', () => {
  it('returns transitions for new status', () => {
    expect(getAvailableTransitions('new')).toEqual(['reviewing', 'expired']);
  });

  it('returns empty array for terminal statuses', () => {
    expect(getAvailableTransitions('won')).toEqual([]);
    expect(getAvailableTransitions('lost')).toEqual([]);
    expect(getAvailableTransitions('expired')).toEqual([]);
  });
});

describe('getDeadlineAlert', () => {
  it('returns null for no deadline', () => {
    expect(getDeadlineAlert(null)).toBeNull();
  });

  it('returns expired for past deadline', () => {
    const past = new Date('2020-01-01').toISOString();
    const alert = getDeadlineAlert(past);
    expect(alert?.level).toBe('expired');
    expect(alert?.hoursRemaining).toBe(0);
  });

  it('returns urgent for deadline within 24 hours', () => {
    const now = new Date();
    const soon = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
    const alert = getDeadlineAlert(soon, now);
    expect(alert?.level).toBe('urgent');
  });

  it('returns warning for deadline within 72 hours', () => {
    const now = new Date();
    const medium = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    const alert = getDeadlineAlert(medium, now);
    expect(alert?.level).toBe('warning');
  });

  it('returns normal for far future deadline', () => {
    const now = new Date();
    const far = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const alert = getDeadlineAlert(far, now);
    expect(alert?.level).toBe('normal');
  });
});

describe('getStatusColor', () => {
  it('returns color for each status', () => {
    expect(getStatusColor('new')).toContain('blue');
    expect(getStatusColor('won')).toContain('green');
    expect(getStatusColor('lost')).toContain('red');
    expect(getStatusColor('expired')).toContain('gray');
  });
});

describe('getSourceLabel', () => {
  it('returns MERX for merx', () => {
    expect(getSourceLabel('merx')).toBe('MERX');
  });

  it('returns Bids & Tenders for bids_tenders', () => {
    expect(getSourceLabel('bids_tenders')).toBe('Bids & Tenders');
  });
});
