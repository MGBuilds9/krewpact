import { describe, expect, it } from 'vitest';

import {
  inspectionCreateSchema,
  inspectionUpdateSchema,
  safetyFormCreateSchema,
  safetyFormUpdateSchema,
  safetyIncidentCreateSchema,
  safetyIncidentUpdateSchema,
  toolboxTalkCreateSchema,
  toolboxTalkUpdateSchema,
} from '@/lib/validators/safety';

// ============================================================
// safetyFormCreateSchema
// ============================================================
describe('safetyFormCreateSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = safetyFormCreateSchema.safeParse({
      form_type: 'daily_hazard_assessment',
      form_date: '2026-02-26',
      payload: { site: 'MDM Site A', supervisor: 'John' },
    });
    expect(result.success).toBe(true);
  });

  it('fails when form_type is missing', () => {
    const result = safetyFormCreateSchema.safeParse({
      form_date: '2026-02-26',
      payload: {},
    });
    expect(result.success).toBe(false);
  });

  it('fails when form_date is missing', () => {
    const result = safetyFormCreateSchema.safeParse({
      form_type: 'daily_hazard_assessment',
      payload: {},
    });
    expect(result.success).toBe(false);
  });

  it('fails when payload is missing', () => {
    const result = safetyFormCreateSchema.safeParse({
      form_type: 'daily_hazard_assessment',
      form_date: '2026-02-26',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// safetyFormUpdateSchema
// ============================================================
describe('safetyFormUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = safetyFormUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid state enum values', () => {
    const states = ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'void'] as const;
    for (const state of states) {
      expect(safetyFormUpdateSchema.safeParse({ state }).success).toBe(true);
    }
  });

  it('fails when state is invalid', () => {
    const result = safetyFormUpdateSchema.safeParse({ state: 'pending' });
    expect(result.success).toBe(false);
  });

  it('accepts nullable submitted_at', () => {
    const result = safetyFormUpdateSchema.safeParse({ submitted_at: null });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// safetyIncidentCreateSchema
// ============================================================
describe('safetyIncidentCreateSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = safetyIncidentCreateSchema.safeParse({
      incident_date: '2026-02-26',
      severity: 'medium',
      summary: 'Worker slipped on wet surface near entrance.',
      details: { location: 'Main entrance', witnesses: ['Jane', 'Bob'] },
    });
    expect(result.success).toBe(true);
  });

  it('fails when incident_date is missing', () => {
    const result = safetyIncidentCreateSchema.safeParse({
      severity: 'high',
      summary: 'Slip incident.',
      details: {},
    });
    expect(result.success).toBe(false);
  });

  it('fails when severity is invalid', () => {
    const result = safetyIncidentCreateSchema.safeParse({
      incident_date: '2026-02-26',
      severity: 'extreme',
      summary: 'Incident.',
      details: {},
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid severity levels', () => {
    for (const severity of ['low', 'medium', 'high', 'critical'] as const) {
      expect(
        safetyIncidentCreateSchema.safeParse({
          incident_date: '2026-02-26',
          severity,
          summary: 'Test incident.',
          details: {},
        }).success,
      ).toBe(true);
    }
  });

  it('fails when summary exceeds 500 characters', () => {
    const result = safetyIncidentCreateSchema.safeParse({
      incident_date: '2026-02-26',
      severity: 'low',
      summary: 'A'.repeat(501),
      details: {},
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// safetyIncidentUpdateSchema
// ============================================================
describe('safetyIncidentUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = safetyIncidentUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with severity only', () => {
    const result = safetyIncidentUpdateSchema.safeParse({ severity: 'critical' });
    expect(result.success).toBe(true);
  });

  it('accepts nullable closed_at', () => {
    const result = safetyIncidentUpdateSchema.safeParse({ closed_at: null });
    expect(result.success).toBe(true);
  });

  it('fails when severity is invalid', () => {
    const result = safetyIncidentUpdateSchema.safeParse({ severity: 'severe' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// toolboxTalkCreateSchema
// ============================================================
describe('toolboxTalkCreateSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = toolboxTalkCreateSchema.safeParse({
      talk_date: '2026-02-26',
      topic: 'Fall protection and harness inspection',
      attendee_count: 12,
    });
    expect(result.success).toBe(true);
  });

  it('fails when talk_date is missing', () => {
    const result = toolboxTalkCreateSchema.safeParse({
      topic: 'Fall protection',
      attendee_count: 5,
    });
    expect(result.success).toBe(false);
  });

  it('fails when attendee_count is negative', () => {
    const result = toolboxTalkCreateSchema.safeParse({
      talk_date: '2026-02-26',
      topic: 'Safety',
      attendee_count: -1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts zero attendee_count (cancelled talk)', () => {
    const result = toolboxTalkCreateSchema.safeParse({
      talk_date: '2026-02-26',
      topic: 'PPE usage',
      attendee_count: 0,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// toolboxTalkUpdateSchema
// ============================================================
describe('toolboxTalkUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = toolboxTalkUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts nullable notes', () => {
    const result = toolboxTalkUpdateSchema.safeParse({ notes: null });
    expect(result.success).toBe(true);
  });

  it('fails when topic exceeds 200 characters', () => {
    const result = toolboxTalkUpdateSchema.safeParse({ topic: 'T'.repeat(201) });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// inspectionCreateSchema
// ============================================================
describe('inspectionCreateSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = inspectionCreateSchema.safeParse({
      inspection_type: 'pre_pour',
      inspection_date: '2026-02-26',
      payload: { inspector: 'David', result: 'pass' },
    });
    expect(result.success).toBe(true);
  });

  it('fails when inspection_type is missing', () => {
    const result = inspectionCreateSchema.safeParse({
      inspection_date: '2026-02-26',
      payload: {},
    });
    expect(result.success).toBe(false);
  });

  it('fails when payload is missing', () => {
    const result = inspectionCreateSchema.safeParse({
      inspection_type: 'pre_pour',
      inspection_date: '2026-02-26',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// inspectionUpdateSchema
// ============================================================
describe('inspectionUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = inspectionUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid state enum values', () => {
    const states = ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'void'] as const;
    for (const state of states) {
      expect(inspectionUpdateSchema.safeParse({ state }).success).toBe(true);
    }
  });

  it('fails when state is invalid', () => {
    const result = inspectionUpdateSchema.safeParse({ state: 'complete' });
    expect(result.success).toBe(false);
  });
});
