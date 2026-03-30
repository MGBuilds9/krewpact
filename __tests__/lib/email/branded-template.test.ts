import { describe, expect,it } from 'vitest';

import { wrapInBrandedTemplate } from '@/lib/email/branded-template';
import type { BrandingConfig } from '@/lib/validators/branding';

describe('wrapInBrandedTemplate', () => {
  it('includes company name in output', () => {
    const branding: BrandingConfig = { company_name: 'Acme Corp' };
    const result = wrapInBrandedTemplate('<p>Hello</p>', branding);
    expect(result).toContain('Acme Corp');
  });

  it('uses primary_color in header background', () => {
    const branding: BrandingConfig = { primary_color: '#ff0000' };
    const result = wrapInBrandedTemplate('<p>Hello</p>', branding);
    expect(result).toContain('background-color:#ff0000');
  });

  it('shows img tag when logo_url is provided', () => {
    const branding: BrandingConfig = {
      logo_url: 'https://example.com/logo.png',
      company_name: 'Acme Corp',
    };
    const result = wrapInBrandedTemplate('<p>Hello</p>', branding);
    expect(result).toContain('<img');
    expect(result).toContain('https://example.com/logo.png');
  });

  it('falls back to text when no logo_url is provided', () => {
    const branding: BrandingConfig = { company_name: 'Text Only Co' };
    const result = wrapInBrandedTemplate('<p>Hello</p>', branding);
    expect(result).not.toContain('<img');
    expect(result).toContain('Text Only Co');
  });

  it('defaults company name to KrewPact when not provided', () => {
    const result = wrapInBrandedTemplate('<p>Hello</p>', {});
    expect(result).toContain('KrewPact');
  });
});
