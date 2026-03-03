import { describe, it, expect } from 'vitest';
import {
  webhookReplaySchema,
  erpSyncControlSchema,
  notificationReplaySchema,
  auditLogQuerySchema,
  featureFlagFilterSchema,
} from '@/lib/validators/system';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// ============================================================
// webhookReplaySchema
// ============================================================
describe('webhookReplaySchema', () => {
  it('accepts valid input with required field', () => {
    const result = webhookReplaySchema.safeParse({ webhook_event_id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('fails when webhook_event_id is missing', () => {
    const result = webhookReplaySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when webhook_event_id is not a valid UUID', () => {
    const result = webhookReplaySchema.safeParse({ webhook_event_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// erpSyncControlSchema
// ============================================================
describe('erpSyncControlSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = erpSyncControlSchema.safeParse({
      entity_type: 'Customer',
      action: 'retry',
    });
    expect(result.success).toBe(true);
  });

  it('fails when entity_type is missing', () => {
    const result = erpSyncControlSchema.safeParse({ action: 'retry' });
    expect(result.success).toBe(false);
  });

  it('fails when action is missing', () => {
    const result = erpSyncControlSchema.safeParse({ entity_type: 'Customer' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid action enum values', () => {
    for (const action of ['pause', 'resume', 'retry', 'cancel'] as const) {
      expect(erpSyncControlSchema.safeParse({ entity_type: 'Customer', action }).success).toBe(
        true,
      );
    }
  });

  it('fails when action is invalid', () => {
    const result = erpSyncControlSchema.safeParse({
      entity_type: 'Customer',
      action: 'restart',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional entity_id as valid UUID', () => {
    const result = erpSyncControlSchema.safeParse({
      entity_type: 'Customer',
      action: 'pause',
      entity_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// notificationReplaySchema
// ============================================================
describe('notificationReplaySchema', () => {
  it('accepts valid input with required field', () => {
    const result = notificationReplaySchema.safeParse({ notification_id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('fails when notification_id is missing', () => {
    const result = notificationReplaySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when notification_id is not a valid UUID', () => {
    const result = notificationReplaySchema.safeParse({ notification_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// auditLogQuerySchema
// ============================================================
describe('auditLogQuerySchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = auditLogQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid query with multiple filters', () => {
    const result = auditLogQuerySchema.safeParse({
      entity_type: 'project',
      entity_id: VALID_UUID,
      action: 'update',
      from_date: '2026-01-01',
      to_date: '2026-02-28',
      limit: 50,
      offset: 0,
    });
    expect(result.success).toBe(true);
  });

  it('fails when limit exceeds 100', () => {
    const result = auditLogQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('fails when offset is negative', () => {
    const result = auditLogQuerySchema.safeParse({ offset: -1 });
    expect(result.success).toBe(false);
  });

  it('fails when entity_id is not a valid UUID', () => {
    const result = auditLogQuerySchema.safeParse({ entity_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// featureFlagFilterSchema
// ============================================================
describe('featureFlagFilterSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = featureFlagFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid feature_name filter', () => {
    const result = featureFlagFilterSchema.safeParse({ feature_name: 'portal_trade' });
    expect(result.success).toBe(true);
  });

  it('accepts is_enabled boolean filter', () => {
    const result = featureFlagFilterSchema.safeParse({ is_enabled: true });
    expect(result.success).toBe(true);
  });

  it('accepts valid division_id UUID', () => {
    const result = featureFlagFilterSchema.safeParse({ division_id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('fails when division_id is not a valid UUID', () => {
    const result = featureFlagFilterSchema.safeParse({ division_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});
