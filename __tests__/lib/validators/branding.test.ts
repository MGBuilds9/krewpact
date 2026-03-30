import { describe, expect, it } from 'vitest';

import { brandingSchema, DEFAULT_BRANDING } from '@/lib/validators/branding';

describe('brandingSchema', () => {
  it('accepts valid full branding', () => {
    const result = brandingSchema.safeParse({
      company_name: 'Acme Construction',
      primary_color: '#ff5500',
      accent_color: '#00cc88',
      logo_url: 'https://cdn.example.com/logo.png',
      support_email: 'help@acme.com',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all optional)', () => {
    expect(brandingSchema.safeParse({}).success).toBe(true);
  });

  it('rejects invalid hex color', () => {
    expect(brandingSchema.safeParse({ primary_color: 'red' }).success).toBe(false);
    expect(brandingSchema.safeParse({ primary_color: '#fff' }).success).toBe(false);
  });

  it('rejects invalid subdomain', () => {
    expect(brandingSchema.safeParse({ subdomain: 'CAPS' }).success).toBe(false);
    expect(brandingSchema.safeParse({ subdomain: 'has spaces' }).success).toBe(false);
    expect(brandingSchema.safeParse({ subdomain: 'valid-name' }).success).toBe(true);
  });

  it('default branding is valid', () => {
    expect(brandingSchema.safeParse(DEFAULT_BRANDING).success).toBe(true);
  });
});
