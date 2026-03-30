import { createServiceClient } from '@/lib/supabase/server';

export interface TenantInfo {
  orgId: string;
  orgSlug: string;
  branding: Record<string, unknown> | null;
}

const MAIN_DOMAINS = new Set(['krewpact.com', 'www.krewpact.com', 'localhost']);
const KREWPACT_BASE = 'krewpact.com';
const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  value: TenantInfo | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function stripPort(hostname: string): string {
  const colonIdx = hostname.lastIndexOf(':');
  if (colonIdx === -1) return hostname;
  // IPv6 addresses contain colons but are wrapped in brackets
  if (hostname.startsWith('[')) return hostname;
  return hostname.slice(0, colonIdx);
}

export async function resolveTenant(hostname: string): Promise<TenantInfo | null> {
  const host = stripPort(hostname);

  if (!host || MAIN_DOMAINS.has(host)) {
    return null;
  }

  const cached = cache.get(host);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let result: TenantInfo | null = null;

  const parts = host.split('.');
  const isKrewpactSubdomain =
    parts.length === 3 && parts.slice(1).join('.') === KREWPACT_BASE;

  const supabase = createServiceClient();

  if (isKrewpactSubdomain) {
    const subdomain = parts[0];
    const { data } = await supabase
      .from('organizations')
      .select('id, slug, org_settings(branding)')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (data) {
      const settings = Array.isArray(data.org_settings)
        ? data.org_settings[0]
        : data.org_settings;
      result = {
        orgId: data.id as string,
        orgSlug: data.slug as string,
        branding: (settings?.branding as Record<string, unknown> | null) ?? null,
      };
    }
  } else {
    const { data } = await supabase
      .from('organizations')
      .select('id, slug, org_settings(branding)')
      .eq('custom_domain', host)
      .maybeSingle();

    if (data) {
      const settings = Array.isArray(data.org_settings)
        ? data.org_settings[0]
        : data.org_settings;
      result = {
        orgId: data.id as string,
        orgSlug: data.slug as string,
        branding: (settings?.branding as Record<string, unknown> | null) ?? null,
      };
    }
  }

  cache.set(host, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
