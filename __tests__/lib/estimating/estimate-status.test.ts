import { describe, it, expect } from 'vitest';
import {
  ALLOWED_STATUS_TRANSITIONS,
  validateStatusTransition,
  type EstimateStatus,
} from '@/lib/estimating/estimate-status';

describe('ALLOWED_STATUS_TRANSITIONS', () => {
  it('defines transitions for all 6 statuses', () => {
    const statuses: EstimateStatus[] = [
      'draft',
      'review',
      'sent',
      'approved',
      'rejected',
      'superseded',
    ];
    for (const status of statuses) {
      expect(ALLOWED_STATUS_TRANSITIONS).toHaveProperty(status);
    }
  });

  it('draft can only go to review', () => {
    expect(ALLOWED_STATUS_TRANSITIONS.draft).toEqual(['review']);
  });

  it('review can go to sent or back to draft', () => {
    expect(ALLOWED_STATUS_TRANSITIONS.review).toEqual(['sent', 'draft']);
  });

  it('sent can go to approved or rejected', () => {
    expect(ALLOWED_STATUS_TRANSITIONS.sent).toEqual(['approved', 'rejected']);
  });

  it('approved is terminal', () => {
    expect(ALLOWED_STATUS_TRANSITIONS.approved).toEqual([]);
  });

  it('rejected is terminal', () => {
    expect(ALLOWED_STATUS_TRANSITIONS.rejected).toEqual([]);
  });

  it('superseded is terminal', () => {
    expect(ALLOWED_STATUS_TRANSITIONS.superseded).toEqual([]);
  });
});

describe('validateStatusTransition', () => {
  it('allows draft → review', () => {
    const result = validateStatusTransition('draft', 'review');
    expect(result).toEqual({ valid: true });
  });

  it('allows review → sent', () => {
    const result = validateStatusTransition('review', 'sent');
    expect(result).toEqual({ valid: true });
  });

  it('allows review → draft (return to draft)', () => {
    const result = validateStatusTransition('review', 'draft');
    expect(result).toEqual({ valid: true });
  });

  it('allows sent → approved', () => {
    const result = validateStatusTransition('sent', 'approved');
    expect(result).toEqual({ valid: true });
  });

  it('allows sent → rejected', () => {
    const result = validateStatusTransition('sent', 'rejected');
    expect(result).toEqual({ valid: true });
  });

  it('rejects draft → approved (skip stages)', () => {
    const result = validateStatusTransition('draft', 'approved');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('not allowed');
    }
  });

  it('rejects draft → sent (skip review)', () => {
    const result = validateStatusTransition('draft', 'sent');
    expect(result.valid).toBe(false);
  });

  it('rejects same status transition', () => {
    const result = validateStatusTransition('draft', 'draft');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('Already in status');
    }
  });

  it('rejects transition from terminal status (approved)', () => {
    const result = validateStatusTransition('approved', 'draft');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('terminal');
    }
  });

  it('rejects transition from terminal status (rejected)', () => {
    const result = validateStatusTransition('rejected', 'review');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('terminal');
    }
  });

  it('rejects transition from terminal status (superseded)', () => {
    const result = validateStatusTransition('superseded', 'draft');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('terminal');
    }
  });
});
