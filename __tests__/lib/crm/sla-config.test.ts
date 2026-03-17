import { describe, expect, it } from 'vitest';

import {
  calculateSLAStatus,
  isOverdue,
  LEAD_SLA_CONFIG,
  OPPORTUNITY_SLA_CONFIG,
} from '@/lib/crm/sla-config';

describe('calculateSLAStatus', () => {
  const now = new Date('2026-02-27T12:00:00Z');

  it('returns null for stages not in config', () => {
    const status = calculateSLAStatus('won', '2026-02-27T00:00:00Z', LEAD_SLA_CONFIG, now);
    expect(status).toBeNull();
  });

  it('calculates time remaining for "new" lead (48h SLA)', () => {
    // Entered 24 hours ago
    const enteredAt = new Date('2026-02-26T12:00:00Z');
    const status = calculateSLAStatus('new', enteredAt.toISOString(), LEAD_SLA_CONFIG, now);
    expect(status).not.toBeNull();
    expect(status!.isOverdue).toBe(false);
    expect(status!.hoursRemaining).toBeCloseTo(24, 0);
    expect(status!.hoursElapsed).toBeCloseTo(24, 0);
    expect(status!.percentUsed).toBeCloseTo(50, 0);
  });

  it('marks as overdue when past SLA deadline', () => {
    // Entered 72 hours ago (48h SLA)
    const enteredAt = new Date('2026-02-24T12:00:00Z');
    const status = calculateSLAStatus('new', enteredAt.toISOString(), LEAD_SLA_CONFIG, now);
    expect(status).not.toBeNull();
    expect(status!.isOverdue).toBe(true);
    expect(status!.hoursRemaining).toBe(0);
    expect(status!.hoursElapsed).toBeCloseTo(72, 0);
    expect(status!.percentUsed).toBe(100);
  });

  it('handles null stage_entered_at (shows full time remaining)', () => {
    const status = calculateSLAStatus('new', null, LEAD_SLA_CONFIG, now);
    expect(status).not.toBeNull();
    expect(status!.isOverdue).toBe(false);
    expect(status!.hoursRemaining).toBe(48);
    expect(status!.hoursElapsed).toBe(0);
    expect(status!.percentUsed).toBe(0);
  });

  it('calculates opportunity SLA correctly', () => {
    // intake has 24h SLA, entered 12h ago
    const enteredAt = new Date('2026-02-27T00:00:00Z');
    const status = calculateSLAStatus(
      'intake',
      enteredAt.toISOString(),
      OPPORTUNITY_SLA_CONFIG,
      now,
    );
    expect(status).not.toBeNull();
    expect(status!.isOverdue).toBe(false);
    expect(status!.hoursRemaining).toBeCloseTo(12, 0);
  });

  it('handles qualified stage (5 day / 120h SLA)', () => {
    // 100 hours in
    const enteredAt = new Date(now.getTime() - 100 * 60 * 60 * 1000);
    const status = calculateSLAStatus('qualified', enteredAt.toISOString(), LEAD_SLA_CONFIG, now);
    expect(status).not.toBeNull();
    expect(status!.isOverdue).toBe(false);
    expect(status!.hoursRemaining).toBeCloseTo(20, 0);
    expect(status!.percentUsed).toBeCloseTo(83.3, 0);
  });

  it('handles estimating stage (7 day / 168h SLA)', () => {
    // 170 hours in (overdue)
    const enteredAt = new Date(now.getTime() - 170 * 60 * 60 * 1000);
    const status = calculateSLAStatus('estimating', enteredAt.toISOString(), LEAD_SLA_CONFIG, now);
    expect(status).not.toBeNull();
    expect(status!.isOverdue).toBe(true);
  });
});

describe('isOverdue', () => {
  it('returns true for overdue leads', () => {
    const enteredAt = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    expect(isOverdue('new', enteredAt, LEAD_SLA_CONFIG)).toBe(true);
  });

  it('returns false for leads within SLA', () => {
    const enteredAt = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    expect(isOverdue('new', enteredAt, LEAD_SLA_CONFIG)).toBe(false);
  });

  it('returns false for terminal stages (no SLA)', () => {
    const enteredAt = new Date(Date.now() - 9999 * 60 * 60 * 1000).toISOString();
    expect(isOverdue('won', enteredAt, LEAD_SLA_CONFIG)).toBe(false);
    expect(isOverdue('lost', enteredAt, LEAD_SLA_CONFIG)).toBe(false);
  });

  it('returns false for null stage_entered_at', () => {
    expect(isOverdue('new', null, LEAD_SLA_CONFIG)).toBe(false);
  });
});

describe('SLA config completeness', () => {
  it('LEAD_SLA_CONFIG covers active stages', () => {
    const stages = LEAD_SLA_CONFIG.map((c) => c.stage);
    expect(stages).toContain('new');
    expect(stages).toContain('qualified');
    expect(stages).toContain('estimating');
    expect(stages).toContain('proposal_sent');
    // Terminal stages should NOT have SLA
    expect(stages).not.toContain('won');
    expect(stages).not.toContain('lost');
  });

  it('OPPORTUNITY_SLA_CONFIG covers active stages', () => {
    const stages = OPPORTUNITY_SLA_CONFIG.map((c) => c.stage);
    expect(stages).toContain('intake');
    expect(stages).toContain('site_visit');
    expect(stages).toContain('estimating');
    expect(stages).toContain('proposal');
    expect(stages).toContain('negotiation');
    expect(stages).not.toContain('contracted');
    expect(stages).not.toContain('closed_lost');
  });

  it('all SLA configs have positive maxHours', () => {
    for (const config of [...LEAD_SLA_CONFIG, ...OPPORTUNITY_SLA_CONFIG]) {
      expect(config.maxHours).toBeGreaterThan(0);
    }
  });
});
