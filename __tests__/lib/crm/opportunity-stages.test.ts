import { describe, it, expect } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  validateTransition,
  type OpportunityStage,
} from '@/lib/crm/opportunity-stages';

describe('ALLOWED_TRANSITIONS', () => {
  it('defines transitions for all 7 stages', () => {
    const stages: OpportunityStage[] = [
      'intake',
      'site_visit',
      'estimating',
      'proposal',
      'negotiation',
      'contracted',
      'closed_lost',
    ];
    expect(Object.keys(ALLOWED_TRANSITIONS)).toEqual(
      expect.arrayContaining(stages),
    );
    expect(Object.keys(ALLOWED_TRANSITIONS)).toHaveLength(7);
  });

  it('contracted and closed_lost are terminal (no transitions out)', () => {
    expect(ALLOWED_TRANSITIONS.contracted).toEqual([]);
    expect(ALLOWED_TRANSITIONS.closed_lost).toEqual([]);
  });

  it('every non-terminal stage can transition to closed_lost', () => {
    const nonTerminal: OpportunityStage[] = [
      'intake',
      'site_visit',
      'estimating',
      'proposal',
      'negotiation',
    ];
    for (const stage of nonTerminal) {
      expect(ALLOWED_TRANSITIONS[stage]).toContain('closed_lost');
    }
  });
});

describe('validateTransition', () => {
  it('allows intake -> site_visit', () => {
    expect(validateTransition('intake', 'site_visit')).toEqual({ valid: true });
  });

  it('allows site_visit -> estimating', () => {
    expect(validateTransition('site_visit', 'estimating')).toEqual({ valid: true });
  });

  it('allows estimating -> proposal', () => {
    expect(validateTransition('estimating', 'proposal')).toEqual({ valid: true });
  });

  it('allows proposal -> negotiation', () => {
    expect(validateTransition('proposal', 'negotiation')).toEqual({ valid: true });
  });

  it('allows negotiation -> contracted', () => {
    expect(validateTransition('negotiation', 'contracted')).toEqual({ valid: true });
  });

  it('allows any non-terminal stage -> closed_lost', () => {
    const stages: OpportunityStage[] = [
      'intake',
      'site_visit',
      'estimating',
      'proposal',
      'negotiation',
    ];
    for (const stage of stages) {
      expect(validateTransition(stage, 'closed_lost')).toEqual({ valid: true });
    }
  });

  it('rejects skipping stages (intake -> contracted)', () => {
    const result = validateTransition('intake', 'contracted');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('not allowed');
    }
  });

  it('rejects transitions out of terminal states (contracted -> intake)', () => {
    const result = validateTransition('contracted', 'intake');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('terminal');
    }
  });

  it('rejects transitions out of closed_lost', () => {
    const result = validateTransition('closed_lost', 'intake');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('terminal');
    }
  });

  it('rejects same-stage transition', () => {
    const result = validateTransition('intake', 'intake');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('Already in stage');
    }
  });

  it('rejects backward transitions (proposal -> site_visit)', () => {
    const result = validateTransition('proposal', 'site_visit');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('not allowed');
    }
  });
});
