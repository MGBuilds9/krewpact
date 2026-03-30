import { z } from 'zod';

export const brandingSchema = z.object({
  company_name: z.string().min(1).max(100).optional(),
  logo_url: z.string().url().optional(),
  favicon_url: z.string().url().optional(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  support_email: z.string().email().optional(),
  support_url: z.string().url().optional(),
  login_background_url: z.string().url().optional(),
  custom_domain: z.string().max(253).optional(),
  subdomain: z.string().max(63).regex(/^[a-z0-9-]+$/).optional(),
});

export type BrandingConfig = z.infer<typeof brandingSchema>;

export const DEFAULT_BRANDING: BrandingConfig = {
  company_name: 'KrewPact',
  primary_color: '#2563eb',
  accent_color: '#f59e0b',
};
