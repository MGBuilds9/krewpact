import { describe, expect, it } from 'vitest';

import {
  divisionSetupCreateSchema,
  notificationPreferenceUpdateSchema,
  policyOverrideCreateSchema,
  profileUpdateSchema,
  rolePermissionEditorSchema,
  userProvisioningSchema,
} from '@/lib/validators/org';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_UUID_2 = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

// ============================================================
// profileUpdateSchema
// ============================================================
describe('profileUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = profileUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid full profile update', () => {
    const result = profileUpdateSchema.safeParse({
      full_name: 'Michael Guirguis',
      email: 'michael@mdmgroupinc.ca',
      phone: '+1-905-555-0100',
    });
    expect(result.success).toBe(true);
  });

  it('fails when email is invalid format', () => {
    const result = profileUpdateSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('fails when avatar_url is not a valid URL', () => {
    const result = profileUpdateSchema.safeParse({ avatar_url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('accepts nullable phone and avatar_url', () => {
    const result = profileUpdateSchema.safeParse({ phone: null, avatar_url: null });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// divisionSetupCreateSchema
// ============================================================
describe('divisionSetupCreateSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = divisionSetupCreateSchema.safeParse({
      name: 'MDM Contracting',
      code: 'contracting',
    });
    expect(result.success).toBe(true);
  });

  it('fails when name is missing', () => {
    const result = divisionSetupCreateSchema.safeParse({ code: 'contracting' });
    expect(result.success).toBe(false);
  });

  it('fails when code is missing', () => {
    const result = divisionSetupCreateSchema.safeParse({ name: 'MDM Contracting' });
    expect(result.success).toBe(false);
  });

  it('fails when code exceeds 20 characters', () => {
    const result = divisionSetupCreateSchema.safeParse({
      name: 'Division',
      code: 'c'.repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional description', () => {
    const result = divisionSetupCreateSchema.safeParse({
      name: 'MDM Homes',
      code: 'homes',
      description: 'Residential construction division',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// userProvisioningSchema
// ============================================================
describe('userProvisioningSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = userProvisioningSchema.safeParse({
      email: 'david@mdmgroupinc.ca',
      full_name: 'David COO',
      role_ids: [VALID_UUID],
      division_ids: [VALID_UUID],
    });
    expect(result.success).toBe(true);
  });

  it('fails when email is missing', () => {
    const result = userProvisioningSchema.safeParse({
      full_name: 'David',
      role_ids: [VALID_UUID],
      division_ids: [VALID_UUID],
    });
    expect(result.success).toBe(false);
  });

  it('fails when role_ids is empty array', () => {
    const result = userProvisioningSchema.safeParse({
      email: 'david@mdmgroupinc.ca',
      full_name: 'David',
      role_ids: [],
      division_ids: [VALID_UUID],
    });
    expect(result.success).toBe(false);
  });

  it('fails when division_ids is empty array', () => {
    const result = userProvisioningSchema.safeParse({
      email: 'david@mdmgroupinc.ca',
      full_name: 'David',
      role_ids: [VALID_UUID],
      division_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts multiple role_ids and division_ids', () => {
    const result = userProvisioningSchema.safeParse({
      email: 'david@mdmgroupinc.ca',
      full_name: 'David',
      role_ids: [VALID_UUID, VALID_UUID_2],
      division_ids: [VALID_UUID, VALID_UUID_2],
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// rolePermissionEditorSchema
// ============================================================
describe('rolePermissionEditorSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = rolePermissionEditorSchema.safeParse({
      role_id: VALID_UUID,
      permission_id: VALID_UUID_2,
      granted: true,
    });
    expect(result.success).toBe(true);
  });

  it('fails when role_id is missing', () => {
    const result = rolePermissionEditorSchema.safeParse({
      permission_id: VALID_UUID,
      granted: true,
    });
    expect(result.success).toBe(false);
  });

  it('fails when granted is missing', () => {
    const result = rolePermissionEditorSchema.safeParse({
      role_id: VALID_UUID,
      permission_id: VALID_UUID_2,
    });
    expect(result.success).toBe(false);
  });

  it('fails when role_id is not a valid UUID', () => {
    const result = rolePermissionEditorSchema.safeParse({
      role_id: 'not-a-uuid',
      permission_id: VALID_UUID,
      granted: false,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// policyOverrideCreateSchema
// ============================================================
describe('policyOverrideCreateSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = policyOverrideCreateSchema.safeParse({
      user_id: VALID_UUID,
      permission_id: VALID_UUID_2,
      override_value: true,
      reason: 'Temporary project manager access during maternity leave.',
    });
    expect(result.success).toBe(true);
  });

  it('fails when user_id is missing', () => {
    const result = policyOverrideCreateSchema.safeParse({
      permission_id: VALID_UUID,
      override_value: true,
      reason: 'Temp access',
    });
    expect(result.success).toBe(false);
  });

  it('fails when reason is missing', () => {
    const result = policyOverrideCreateSchema.safeParse({
      user_id: VALID_UUID,
      permission_id: VALID_UUID_2,
      override_value: false,
    });
    expect(result.success).toBe(false);
  });

  it('fails when reason is empty string', () => {
    const result = policyOverrideCreateSchema.safeParse({
      user_id: VALID_UUID,
      permission_id: VALID_UUID_2,
      override_value: true,
      reason: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional expires_at', () => {
    const result = policyOverrideCreateSchema.safeParse({
      user_id: VALID_UUID,
      permission_id: VALID_UUID_2,
      override_value: true,
      reason: 'Temp override',
      expires_at: '2026-03-31T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// notificationPreferenceUpdateSchema
// ============================================================
describe('notificationPreferenceUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = notificationPreferenceUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts all boolean preferences', () => {
    const result = notificationPreferenceUpdateSchema.safeParse({
      in_app_enabled: true,
      email_enabled: false,
      push_enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts quiet_hours record', () => {
    const result = notificationPreferenceUpdateSchema.safeParse({
      quiet_hours: { start: '22:00', end: '07:00', timezone: 'America/Toronto' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts nullable quiet_hours', () => {
    const result = notificationPreferenceUpdateSchema.safeParse({ quiet_hours: null });
    expect(result.success).toBe(true);
  });
});
