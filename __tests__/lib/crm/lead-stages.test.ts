import { describe, expect, it } from 'vitest';

import { ALLOWED_TRANSITIONS, type LeadStage, validateTransition } from '@/lib/crm/lead-stages';

describe('ALLOWED_TRANSITIONS', () => {
  it('defines transitions for all 8 stages', () => {
    const stages: LeadStage[] = [
      'new',
      'contacted',
      'qualified',
      'proposal',
      'negotiation',
      'nurture',
      'won',
      'lost',
    ];
    expect(Object.keys(ALLOWED_TRANSITIONS)).toEqual(expect.arrayContaining(stages));
    expect(Object.keys(ALLOWED_TRANSITIONS)).toHaveLength(8);
  });

  it('new transitions include contacted', () => {
    expect(ALLOWED_TRANSITIONS.new).toContain('contacted');
  });

  it('contacted transitions to qualified and lost', () => {
    expect(ALLOWED_TRANSITIONS.contacted).toEqual(['qualified', 'lost']);
  });

  it('won and lost are terminal (no transitions out)', () => {
    expect(ALLOWED_TRANSITIONS.won).toEqual([]);
    expect(ALLOWED_TRANSITIONS.lost).toEqual([]);
  });
});

describe('validateTransition', () => {
  it('allows new → qualified', () => {
    const result = validateTransition('new', 'qualified');
    expect(result).toEqual({ valid: true });
  });

  it('allows qualified → proposal', () => {
    const result = validateTransition('qualified', 'proposal');
    expect(result).toEqual({ valid: true });
  });

  it('allows proposal → negotiation', () => {
    const result = validateTransition('proposal', 'negotiation');
    expect(result).toEqual({ valid: true });
  });

  it('allows negotiation → won', () => {
    const result = validateTransition('negotiation', 'won');
    expect(result).toEqual({ valid: true });
  });

  it('allows any non-terminal stage → lost', () => {
    const stagesWithLost: LeadStage[] = [
      'new',
      'contacted',
      'qualified',
      'proposal',
      'negotiation',
      'nurture',
    ];
    for (const stage of stagesWithLost) {
      const result = validateTransition(stage, 'lost');
      expect(result).toEqual({ valid: true });
    }
  });

  it('rejects skipping stages (new → won)', () => {
    const result = validateTransition('new', 'won');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('not allowed');
    }
  });

  it('rejects transitions out of terminal states (lost → qualified)', () => {
    const result = validateTransition('lost', 'qualified');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('terminal');
    }
  });

  it('rejects transitions out of won state', () => {
    const result = validateTransition('won', 'new');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('terminal');
    }
  });

  it('rejects same-stage transition', () => {
    const result = validateTransition('new', 'new');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('Already in stage');
    }
  });

  it('rejects backward transitions (proposal → new)', () => {
    const result = validateTransition('proposal', 'new');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('not allowed');
    }
  });

  it('allows nurture → contacted (re-engagement)', () => {
    const result = validateTransition('nurture', 'contacted');
    expect(result).toEqual({ valid: true });
  });
});
