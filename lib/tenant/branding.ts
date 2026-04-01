import { createServiceClient } from '@/lib/supabase/server';
import { type BrandingConfig, DEFAULT_BRANDING } from '@/lib/validators/branding';

export interface OrgBrandingInfo {
  company_name: string;
  company_description: string;
  erp_company: string;
  logo_url: string | null;
  favicon_url: string | null;
  footer_text: string;
  primary_color: string;
  accent_color: string;
  support_email: string | null;
  support_url: string | null;
  boldsign_brand_id: string | null;
}

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  value: OrgBrandingInfo;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Resolve org branding by org ID. Used by AI prompts, email templates,
 * ERPNext sync handlers, and page metadata.
 *
 * 60s in-memory TTL cache (matching lib/tenant/resolve.ts pattern).
 * Falls back to DEFAULT_BRANDING when org or branding is missing.
 */
export async function getOrgBranding(orgId: string): Promise<OrgBrandingInfo> {
  const cached = cache.get(orgId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('org_settings')
    .select('branding')
    .eq('org_id', orgId)
    .maybeSingle();

  const branding = (data?.branding as BrandingConfig | null) ?? {};

  const result: OrgBrandingInfo = {
    company_name: branding.company_name ?? DEFAULT_BRANDING.company_name ?? 'KrewPact',
    company_description: branding.company_description ?? '',
    erp_company: branding.erp_company ?? branding.company_name ?? 'KrewPact',
    logo_url: branding.logo_url ?? null,
    favicon_url: branding.favicon_url ?? null,
    footer_text: branding.footer_text ?? `${branding.company_name ?? 'KrewPact'}`,
    primary_color: branding.primary_color ?? DEFAULT_BRANDING.primary_color ?? '#2563eb',
    accent_color: branding.accent_color ?? DEFAULT_BRANDING.accent_color ?? '#f59e0b',
    support_email: branding.support_email ?? null,
    support_url: branding.support_url ?? null,
    boldsign_brand_id: branding.boldsign_brand_id ?? null,
  };

  cache.set(orgId, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
