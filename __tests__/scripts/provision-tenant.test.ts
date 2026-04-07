import { describe, expect, it } from 'vitest';

import { validateTenantConfig } from '@/scripts/provision-tenant';

function validConfig() {
  return {
    organization: {
      name: 'Test Construction Co.',
      slug: 'test-construction',
      subdomain: 'test',
      timezone: 'America/Toronto',
      locale: 'en-CA',
    },
    branding: {
      company_name: 'Test Construction Co.',
      primary_color: '#1e3a5f',
      accent_color: '#f59e0b',
      support_email: 'support@test.com',
    },
    feature_flags: { crm: true, estimates: true },
    divisions: [{ code: 'general', name: 'General Division', description: 'Main division' }],
    admin: {
      email: 'admin@test.com',
      first_name: 'Admin',
      last_name: 'User',
    },
  };
}

describe('validateTenantConfig', () => {
  it('accepts a valid config with no errors', () => {
    const errors = validateTenantConfig(validConfig());
    expect(errors).toEqual([]);
  });

  it('rejects missing organization name', () => {
    const cfg = validConfig();
    cfg.organization.name = '';
    const errors = validateTenantConfig(cfg);
    expect(errors.some((e) => e.field === 'organization.name')).toBe(true);
  });

  it('rejects invalid slug format', () => {
    const cfg = validConfig();
    cfg.organization.slug = 'UPPERCASE-BAD';
    const errors = validateTenantConfig(cfg);
    expect(errors.some((e) => e.field === 'organization.slug')).toBe(true);
  });

  it('rejects reserved slugs', () => {
    const cfg = validConfig();
    cfg.organization.slug = 'admin';
    const errors = validateTenantConfig(cfg);
    expect(errors.some((e) => e.message.includes('Reserved'))).toBe(true);
  });

  it('rejects slug that is too short', () => {
    const cfg = validConfig();
    cfg.organization.slug = 'ab';
    const errors = validateTenantConfig(cfg);
    expect(errors.some((e) => e.field === 'organization.slug')).toBe(true);
  });

  it('rejects slug starting with hyphen', () => {
    const cfg = validConfig();
    cfg.organization.slug = '-bad-slug';
    const errors = validateTenantConfig(cfg);
    expect(errors.some((e) => e.field === 'organization.slug')).toBe(true);
  });

  it('rejects invalid subdomain', () => {
    const cfg = validConfig();
    cfg.organization.subdomain = 'BAD_SUBDOMAIN!';
    const errors = validateTenantConfig(cfg);
    expect(errors.some((e) => e.field === 'organization.subdomain')).toBe(true);
  });

  it('rejects invalid primary color', () => {
    const cfg = validConfig();
    cfg.branding!.primary_color = 'not-a-color';
    const errors = validateTenantConfig(cfg);
    expect(errors.some((e) => e.field === 'branding.primary_color')).toBe(true);
  });

  it('rejects invalid accent color', () => {
    const cfg = validConfig();
    cfg.branding!.accent_color = 'rgb(255,0,0)';
    const errors = validateTenantConfig(cfg);
    expect(errors.some((e) => e.field === 'branding.accent_color')).toBe(true);
  });

  it('rejects invalid support email', () => {
    const cfg = validConfig();
    cfg.branding!.support_email = 'not-an-email';
    const errors = validateTenantConfig(cfg);
    expect(errors.some((e) => e.field === 'branding.support_email')).toBe(true);
  });

  it('rejects empty divisions array', () => {
    const cfg = validConfig();
    cfg.divisions = [];
    const errors = validateTenantConfig(cfg);
    expect(errors.some((e) => e.field === 'divisions')).toBe(true);
  });

  it('rejects duplicate division codes', () => {
    const cfg = validConfig();
    cfg.divisions = [
      { code: 'general', name: 'General', description: '' },
      { code: 'general', name: 'General Dup', description: '' },
    ];
    const errors = validateTenantConfig(cfg);
    expect(errors.some((e) => e.message.includes('Duplicate'))).toBe(true);
  });

  it('rejects division with uppercase code', () => {
    const cfg = validConfig();
    cfg.divisions = [{ code: 'Bad_Code', name: 'Bad', description: '' }];
    const errors = validateTenantConfig(cfg);
    expect(errors.some((e) => e.field.includes('divisions'))).toBe(true);
  });

  it('rejects division with empty name', () => {
    const cfg = validConfig();
    cfg.divisions = [{ code: 'good-code', name: '', description: '' }];
    const errors = validateTenantConfig(cfg);
    expect(errors.some((e) => e.field.includes('divisions') && e.message === 'Required')).toBe(
      true,
    );
  });

  it('rejects admin with invalid email', () => {
    const cfg = validConfig();
    cfg.admin!.email = 'bad-email';
    const errors = validateTenantConfig(cfg);
    expect(errors.some((e) => e.field === 'admin.email')).toBe(true);
  });

  it('rejects admin with empty first name', () => {
    const cfg = validConfig();
    cfg.admin!.first_name = '';
    const errors = validateTenantConfig(cfg);
    expect(errors.some((e) => e.field === 'admin.first_name')).toBe(true);
  });

  it('allows config without admin section', () => {
    const cfg = validConfig();
    delete (cfg as Record<string, unknown>).admin;
    const errors = validateTenantConfig(cfg);
    expect(errors).toEqual([]);
  });

  it('allows config without branding section', () => {
    const cfg = validConfig();
    delete (cfg as Record<string, unknown>).branding;
    const errors = validateTenantConfig(cfg);
    expect(errors).toEqual([]);
  });

  it('allows config without divisions', () => {
    const cfg = validConfig();
    delete (cfg as Record<string, unknown>).divisions;
    const errors = validateTenantConfig(cfg);
    expect(errors).toEqual([]);
  });

  it('accepts valid hex colors', () => {
    const cfg = validConfig();
    cfg.branding!.primary_color = '#000000';
    cfg.branding!.accent_color = '#FFFFFF';
    const errors = validateTenantConfig(cfg);
    expect(errors).toEqual([]);
  });

  it('collects multiple errors at once', () => {
    const cfg = validConfig();
    cfg.organization.name = '';
    cfg.organization.slug = '';
    cfg.admin!.email = 'bad';
    const errors = validateTenantConfig(cfg);
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});
