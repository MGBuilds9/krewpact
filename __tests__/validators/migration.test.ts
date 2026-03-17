import { describe, expect, it } from 'vitest';

import {
  bcpIncidentCreateSchema,
  bcpIncidentUpdateSchema,
  bcpRecoveryEventSchema,
  migrationBatchCreateSchema,
  migrationBatchUpdateSchema,
  migrationConflictResolutionSchema,
  privacyEventSchema,
  privacyRequestCreateSchema,
  privacyRequestUpdateSchema,
} from '@/lib/validators/migration';

// ============================================================
// migrationBatchCreateSchema
// ============================================================
describe('migrationBatchCreateSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = migrationBatchCreateSchema.safeParse({
      source_system: 'sage50',
      batch_name: 'Customer Import Batch 1',
    });
    expect(result.success).toBe(true);
  });

  it('fails when source_system is missing', () => {
    const result = migrationBatchCreateSchema.safeParse({ batch_name: 'Batch 1' });
    expect(result.success).toBe(false);
  });

  it('fails when batch_name is missing', () => {
    const result = migrationBatchCreateSchema.safeParse({ source_system: 'sage50' });
    expect(result.success).toBe(false);
  });

  it('fails when source_system is empty string', () => {
    const result = migrationBatchCreateSchema.safeParse({ source_system: '', batch_name: 'Batch' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// migrationBatchUpdateSchema
// ============================================================
describe('migrationBatchUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = migrationBatchUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid status enum values', () => {
    const statuses = ['queued', 'running', 'completed', 'failed', 'dead_letter'] as const;
    for (const status of statuses) {
      expect(migrationBatchUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = migrationBatchUpdateSchema.safeParse({ status: 'pending' });
    expect(result.success).toBe(false);
  });

  it('accepts optional summary record', () => {
    const result = migrationBatchUpdateSchema.safeParse({
      status: 'completed',
      summary: { records_processed: 500, errors: 2 },
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// migrationConflictResolutionSchema
// ============================================================
describe('migrationConflictResolutionSchema', () => {
  it('accepts valid input with required field', () => {
    const result = migrationConflictResolutionSchema.safeParse({ resolution_status: 'resolved' });
    expect(result.success).toBe(true);
  });

  it('fails when resolution_status is missing', () => {
    const result = migrationConflictResolutionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts all valid resolution_status enum values', () => {
    for (const resolution_status of ['open', 'resolved', 'skipped'] as const) {
      expect(migrationConflictResolutionSchema.safeParse({ resolution_status }).success).toBe(true);
    }
  });

  it('fails when resolution_status is invalid', () => {
    const result = migrationConflictResolutionSchema.safeParse({ resolution_status: 'merged' });
    expect(result.success).toBe(false);
  });

  it('accepts optional resolution_notes', () => {
    const result = migrationConflictResolutionSchema.safeParse({
      resolution_status: 'resolved',
      resolution_notes: 'Merged with existing Sage record ID 12345.',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// privacyRequestCreateSchema
// ============================================================
describe('privacyRequestCreateSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = privacyRequestCreateSchema.safeParse({
      requester_email: 'client@example.com',
      request_type: 'access',
    });
    expect(result.success).toBe(true);
  });

  it('fails when requester_email is missing', () => {
    const result = privacyRequestCreateSchema.safeParse({ request_type: 'deletion' });
    expect(result.success).toBe(false);
  });

  it('fails when requester_email is invalid format', () => {
    const result = privacyRequestCreateSchema.safeParse({
      requester_email: 'not-valid',
      request_type: 'access',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid request_type enum values', () => {
    for (const request_type of ['access', 'correction', 'deletion', 'export'] as const) {
      expect(
        privacyRequestCreateSchema.safeParse({
          requester_email: 'client@example.com',
          request_type,
        }).success,
      ).toBe(true);
    }
  });

  it('fails when request_type is invalid', () => {
    const result = privacyRequestCreateSchema.safeParse({
      requester_email: 'client@example.com',
      request_type: 'opt_out',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// privacyRequestUpdateSchema
// ============================================================
describe('privacyRequestUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = privacyRequestUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid status enum values', () => {
    const statuses = ['received', 'verified', 'in_progress', 'completed', 'rejected'] as const;
    for (const status of statuses) {
      expect(privacyRequestUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = privacyRequestUpdateSchema.safeParse({ status: 'pending_review' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// privacyEventSchema
// ============================================================
describe('privacyEventSchema', () => {
  it('accepts valid input with required field only', () => {
    const result = privacyEventSchema.safeParse({ event_type: 'data_exported' });
    expect(result.success).toBe(true);
  });

  it('fails when event_type is missing', () => {
    const result = privacyEventSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when event_type is empty string', () => {
    const result = privacyEventSchema.safeParse({ event_type: '' });
    expect(result.success).toBe(false);
  });

  it('accepts optional event_payload', () => {
    const result = privacyEventSchema.safeParse({
      event_type: 'identity_verified',
      event_payload: { method: 'government_id', verified_at: '2026-02-26T10:00:00Z' },
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// bcpIncidentCreateSchema
// ============================================================
describe('bcpIncidentCreateSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = bcpIncidentCreateSchema.safeParse({
      incident_number: 'INC-2026-001',
      severity: 'sev2',
      title: 'Supabase connection pool exhaustion',
    });
    expect(result.success).toBe(true);
  });

  it('fails when incident_number is missing', () => {
    const result = bcpIncidentCreateSchema.safeParse({
      severity: 'sev1',
      title: 'Database outage',
    });
    expect(result.success).toBe(false);
  });

  it('fails when severity is invalid', () => {
    const result = bcpIncidentCreateSchema.safeParse({
      incident_number: 'INC-001',
      severity: 'p1',
      title: 'Outage',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid severity enum values', () => {
    for (const severity of ['sev1', 'sev2', 'sev3', 'sev4'] as const) {
      expect(
        bcpIncidentCreateSchema.safeParse({
          incident_number: 'INC-001',
          severity,
          title: 'Test incident',
        }).success,
      ).toBe(true);
    }
  });
});

// ============================================================
// bcpIncidentUpdateSchema
// ============================================================
describe('bcpIncidentUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = bcpIncidentUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid status enum values', () => {
    const statuses = ['open', 'mitigating', 'monitoring', 'resolved', 'closed'] as const;
    for (const status of statuses) {
      expect(bcpIncidentUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = bcpIncidentUpdateSchema.safeParse({ status: 'pending' });
    expect(result.success).toBe(false);
  });

  it('accepts nullable resolved_at', () => {
    const result = bcpIncidentUpdateSchema.safeParse({ resolved_at: null });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// bcpRecoveryEventSchema
// ============================================================
describe('bcpRecoveryEventSchema', () => {
  it('accepts valid input with required field only', () => {
    const result = bcpRecoveryEventSchema.safeParse({ event_type: 'failover_initiated' });
    expect(result.success).toBe(true);
  });

  it('fails when event_type is missing', () => {
    const result = bcpRecoveryEventSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when event_type is empty string', () => {
    const result = bcpRecoveryEventSchema.safeParse({ event_type: '' });
    expect(result.success).toBe(false);
  });

  it('accepts optional event_payload', () => {
    const result = bcpRecoveryEventSchema.safeParse({
      event_type: 'service_restored',
      event_payload: { rto_minutes: 47, services_restored: ['api', 'database'] },
    });
    expect(result.success).toBe(true);
  });
});
