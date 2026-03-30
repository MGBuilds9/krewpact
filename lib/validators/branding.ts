import { z } from 'zod';

/** Transform empty strings to undefined so optional URL/email fields pass validation */
const emptyToUndefined = z.literal('').transform(() => undefined);
const optionalUrl = z.union([emptyToUndefined, z.string().url()]).optional();
const optionalEmail = z.union([emptyToUndefined, z.string().email()]).optional();

export const brandingSchema = z.object({
  company_name: z.union([emptyToUndefined, z.string().min(1).max(100)]).optional(),
  logo_url: optionalUrl,
  favicon_url: optionalUrl,
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  support_email: optionalEmail,
  support_url: optionalUrl,
  login_background_url: optionalUrl,
  custom_domain: z.string().max(253).optional(),
  subdomain: z.string().max(63).regex(/^[a-z0-9-]+$/).optional(),
});

export type BrandingConfig = z.infer<typeof brandingSchema>;

export const DEFAULT_BRANDING: BrandingConfig = {
  company_name: 'KrewPact',
  primary_color: '#2563eb',
  accent_color: '#f59e0b',
};
