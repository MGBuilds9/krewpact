import { describe, it, expect } from 'vitest';
import { portalAccountInviteSchema } from '../../lib/validators/portals';

describe('Portal Account Validators', () => {
  it('validates a correct client invite payload', () => {
    const validData = {
      actor_type: 'client',
      role: 'client_owner',
      projects: ['123e4567-e89b-12d3-a456-426614174000'],
      email: 'client@example.com',
      company_name: 'Acme Corp',
      contact_name: 'John Doe',
      phone: '+1 555-555-5555'
    };

    const result = portalAccountInviteSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actor_type).toBe('client');
      expect(result.data.role).toBe('client_owner');
    }
  });

  it('fails if email is invalid', () => {
    const invalidData = {
      actor_type: 'client',
      email: 'not-an-email'
    };
    
    const result = portalAccountInviteSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('validates trade partner payload without projects', () => {
    const validData = {
      actor_type: 'trade_partner',
      role: 'trade_partner_admin',
      email: 'subcontractor@example.com'
    };

    const result = portalAccountInviteSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
