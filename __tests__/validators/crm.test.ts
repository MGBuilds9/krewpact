import { describe, it, expect } from 'vitest';
import {
  accountCreateSchema,
  accountUpdateSchema,
  contactCreateSchema,
  contactUpdateSchema,
  leadCreateSchema,
  leadUpdateSchema,
  leadStageTransitionSchema,
  opportunityCreateSchema,
  opportunityUpdateSchema,
  activityCreateSchema,
  activityUpdateSchema,
} from '@/lib/validators/crm';

// Valid v4 UUIDs for Zod 4 strict UUID validation
const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_UUID_2 = '550e8400-e29b-41d4-a716-446655440000';

describe('accountCreateSchema', () => {
  it('passes with valid required fields', () => {
    const result = accountCreateSchema.safeParse({
      account_name: 'Acme Construction',
      account_type: 'client',
    });
    expect(result.success).toBe(true);
  });

  it('passes with all optional fields', () => {
    const result = accountCreateSchema.safeParse({
      account_name: 'Acme Construction',
      account_type: 'client',
      division_id: VALID_UUID,
      billing_address: { street: '123 Main St', city: 'Toronto' },
      shipping_address: { street: '456 Elm St', city: 'Mississauga' },
      notes: 'VIP customer',
    });
    expect(result.success).toBe(true);
  });

  it('fails when account_name is missing', () => {
    const result = accountCreateSchema.safeParse({
      account_type: 'client',
    });
    expect(result.success).toBe(false);
  });

  it('fails when account_name is empty string', () => {
    const result = accountCreateSchema.safeParse({
      account_name: '',
      account_type: 'client',
    });
    expect(result.success).toBe(false);
  });

  it('fails when account_name exceeds 200 chars', () => {
    const result = accountCreateSchema.safeParse({
      account_name: 'x'.repeat(201),
      account_type: 'client',
    });
    expect(result.success).toBe(false);
  });

  it('fails when division_id is not a valid UUID', () => {
    const result = accountCreateSchema.safeParse({
      account_name: 'Acme',
      account_type: 'client',
      division_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('accountUpdateSchema', () => {
  it('passes with partial fields', () => {
    const result = accountUpdateSchema.safeParse({
      account_name: 'Updated Name',
    });
    expect(result.success).toBe(true);
  });

  it('passes with empty object (no updates)', () => {
    const result = accountUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('fails when account_name is empty string', () => {
    const result = accountUpdateSchema.safeParse({
      account_name: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('contactCreateSchema', () => {
  it('passes with valid required fields', () => {
    const result = contactCreateSchema.safeParse({
      first_name: 'Jane',
      last_name: 'Smith',
    });
    expect(result.success).toBe(true);
  });

  it('passes with all optional fields', () => {
    const result = contactCreateSchema.safeParse({
      first_name: 'Jane',
      last_name: 'Smith',
      account_id: VALID_UUID,
      email: 'jane@example.com',
      phone: '416-555-0100',
      role_title: 'Project Manager',
      is_primary: true,
    });
    expect(result.success).toBe(true);
  });

  it('fails when first_name is missing', () => {
    const result = contactCreateSchema.safeParse({
      last_name: 'Smith',
    });
    expect(result.success).toBe(false);
  });

  it('fails when last_name is missing', () => {
    const result = contactCreateSchema.safeParse({
      first_name: 'Jane',
    });
    expect(result.success).toBe(false);
  });

  it('fails when email format is invalid', () => {
    const result = contactCreateSchema.safeParse({
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('fails when first_name exceeds 100 chars', () => {
    const result = contactCreateSchema.safeParse({
      first_name: 'x'.repeat(101),
      last_name: 'Smith',
    });
    expect(result.success).toBe(false);
  });
});

describe('contactUpdateSchema', () => {
  it('passes with partial fields', () => {
    const result = contactUpdateSchema.safeParse({
      email: 'new@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('fails when email is invalid format', () => {
    const result = contactUpdateSchema.safeParse({
      email: 'bad-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('leadCreateSchema', () => {
  it('passes with valid required fields', () => {
    const result = leadCreateSchema.safeParse({
      company_name: 'New Office Building Project',
    });
    expect(result.success).toBe(true);
  });

  it('passes with all optional fields', () => {
    const result = leadCreateSchema.safeParse({
      company_name: 'ABC Builders',
      division_id: VALID_UUID,
      source_channel: 'website',
      industry: 'Construction',
      city: 'Toronto',
      province: 'ON',
      notes: 'Key prospect',
      owner_id: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });

  it('fails when company_name is missing', () => {
    const result = leadCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when company_name is empty string', () => {
    const result = leadCreateSchema.safeParse({
      company_name: '',
    });
    expect(result.success).toBe(false);
  });

  it('fails when company_name exceeds 200 chars', () => {
    const result = leadCreateSchema.safeParse({
      company_name: 'x'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('fails when owner_id is not a valid UUID', () => {
    const result = leadCreateSchema.safeParse({
      company_name: 'Test Lead',
      owner_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('passes when owner_id is omitted', () => {
    const result = leadCreateSchema.safeParse({
      company_name: 'Test Lead',
    });
    expect(result.success).toBe(true);
  });

  it('passes with source_channel provided', () => {
    const result = leadCreateSchema.safeParse({
      company_name: 'Test Lead',
      source_channel: 'referral',
    });
    expect(result.success).toBe(true);
  });

  it('passes with industry and city', () => {
    const result = leadCreateSchema.safeParse({
      company_name: 'Test Lead',
      industry: 'Construction',
      city: 'Mississauga',
    });
    expect(result.success).toBe(true);
  });

  it('passes with province field', () => {
    const result = leadCreateSchema.safeParse({
      company_name: 'Test Lead',
      province: 'ON',
    });
    expect(result.success).toBe(true);
  });

  it('passes with notes field', () => {
    const result = leadCreateSchema.safeParse({
      company_name: 'Test Lead',
      notes: 'Follow up next week',
    });
    expect(result.success).toBe(true);
  });
});

describe('leadUpdateSchema', () => {
  it('passes with partial fields', () => {
    const result = leadUpdateSchema.safeParse({
      company_name: 'Updated Name',
      notes: 'Updated notes',
    });
    expect(result.success).toBe(true);
  });
});

describe('leadStageTransitionSchema', () => {
  it('passes with valid stage', () => {
    const result = leadStageTransitionSchema.safeParse({
      stage: 'qualified',
    });
    expect(result.success).toBe(true);
  });

  it('fails with invalid stage enum value', () => {
    const result = leadStageTransitionSchema.safeParse({
      stage: 'invalid_stage',
    });
    expect(result.success).toBe(false);
  });

  it('passes with lost stage and lost_reason', () => {
    const result = leadStageTransitionSchema.safeParse({
      stage: 'lost',
      lost_reason: 'Budget constraints',
    });
    expect(result.success).toBe(true);
  });

  it('fails with lost stage without lost_reason', () => {
    const result = leadStageTransitionSchema.safeParse({
      stage: 'lost',
    });
    expect(result.success).toBe(false);
  });

  it('fails with lost stage and empty lost_reason', () => {
    const result = leadStageTransitionSchema.safeParse({
      stage: 'lost',
      lost_reason: '',
    });
    expect(result.success).toBe(false);
  });

  it('passes with non-lost stage without lost_reason', () => {
    const result = leadStageTransitionSchema.safeParse({
      stage: 'estimating',
    });
    expect(result.success).toBe(true);
  });
});

describe('opportunityCreateSchema', () => {
  it('passes with valid required fields', () => {
    const result = opportunityCreateSchema.safeParse({
      opportunity_name: 'Renovation Phase 1',
    });
    expect(result.success).toBe(true);
  });

  it('passes with all optional fields', () => {
    const result = opportunityCreateSchema.safeParse({
      opportunity_name: 'Renovation Phase 1',
      lead_id: VALID_UUID,
      account_id: VALID_UUID_2,
      contact_id: VALID_UUID,
      division_id: VALID_UUID_2,
      stage: 'site_visit',
      target_close_date: '2026-06-01',
      estimated_revenue: 150000,
      probability_pct: 50,
      owner_user_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('fails when opportunity_name is missing', () => {
    const result = opportunityCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when opportunity_name is empty', () => {
    const result = opportunityCreateSchema.safeParse({
      opportunity_name: '',
    });
    expect(result.success).toBe(false);
  });

  it('fails when opportunity_name exceeds 200 chars', () => {
    const result = opportunityCreateSchema.safeParse({
      opportunity_name: 'x'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('fails when estimated_revenue is negative', () => {
    const result = opportunityCreateSchema.safeParse({
      opportunity_name: 'Test',
      estimated_revenue: -1,
    });
    expect(result.success).toBe(false);
  });

  it('fails when probability_pct exceeds 100', () => {
    const result = opportunityCreateSchema.safeParse({
      opportunity_name: 'Test',
      probability_pct: 150,
    });
    expect(result.success).toBe(false);
  });

  it('fails with invalid stage enum', () => {
    const result = opportunityCreateSchema.safeParse({
      opportunity_name: 'Test',
      stage: 'invalid_stage',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid opportunity stages', () => {
    const validStages = [
      'intake',
      'site_visit',
      'estimating',
      'proposal',
      'negotiation',
      'contracted',
      'closed_lost',
    ];
    for (const stage of validStages) {
      const result = opportunityCreateSchema.safeParse({
        opportunity_name: 'Test',
        stage,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('opportunityUpdateSchema', () => {
  it('passes with partial fields', () => {
    const result = opportunityUpdateSchema.safeParse({
      estimated_revenue: 200000,
      stage: 'proposal',
    });
    expect(result.success).toBe(true);
  });
});

describe('activityCreateSchema', () => {
  it('passes with valid required fields and opportunity_id', () => {
    const result = activityCreateSchema.safeParse({
      activity_type: 'call',
      title: 'Follow-up call',
      opportunity_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('passes with lead_id entity link', () => {
    const result = activityCreateSchema.safeParse({
      activity_type: 'email',
      title: 'Intro email',
      lead_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('passes with account_id entity link', () => {
    const result = activityCreateSchema.safeParse({
      activity_type: 'meeting',
      title: 'Client meeting',
      account_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('passes with contact_id entity link', () => {
    const result = activityCreateSchema.safeParse({
      activity_type: 'note',
      title: 'Contact notes',
      contact_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('fails without any entity ID', () => {
    const result = activityCreateSchema.safeParse({
      activity_type: 'call',
      title: 'Orphaned activity',
    });
    expect(result.success).toBe(false);
  });

  it('fails with invalid activity_type', () => {
    const result = activityCreateSchema.safeParse({
      activity_type: 'invalid_type',
      title: 'Test',
      opportunity_id: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('fails when title is missing', () => {
    const result = activityCreateSchema.safeParse({
      activity_type: 'call',
      opportunity_id: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('fails when title is empty', () => {
    const result = activityCreateSchema.safeParse({
      activity_type: 'call',
      title: '',
      opportunity_id: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('fails when title exceeds 200 chars', () => {
    const result = activityCreateSchema.safeParse({
      activity_type: 'call',
      title: 'x'.repeat(201),
      opportunity_id: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('passes with all optional fields', () => {
    const result = activityCreateSchema.safeParse({
      activity_type: 'task',
      title: 'Follow up task',
      opportunity_id: VALID_UUID,
      lead_id: VALID_UUID_2,
      details: 'Some details about the activity',
      due_at: '2026-03-01T10:00:00Z',
      owner_user_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid activity types', () => {
    const validTypes = ['call', 'email', 'meeting', 'note', 'task'];
    for (const activity_type of validTypes) {
      const result = activityCreateSchema.safeParse({
        activity_type,
        title: 'Test',
        opportunity_id: VALID_UUID,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('activityUpdateSchema', () => {
  it('passes with partial fields', () => {
    const result = activityUpdateSchema.safeParse({
      title: 'Updated title',
      details: 'Updated details',
    });
    expect(result.success).toBe(true);
  });

  it('fails when title is empty', () => {
    const result = activityUpdateSchema.safeParse({
      title: '',
    });
    expect(result.success).toBe(false);
  });
});
