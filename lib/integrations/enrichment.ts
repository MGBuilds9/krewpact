/**
 * Lead enrichment waterfall pipeline.
 * Order: Apollo People Match → Brave Web Search → Tavily AI Search → Google Maps
 * Each source fills gaps the previous didn't. Partial success is fine.
 */

import {
  type ApolloMatchResult,
  enrichFromApolloMatch,
  enrichFromBrave,
  enrichFromGoogleMaps,
  enrichFromTavily,
  type GoogleMapsResult,
} from './enrichment-sources';

export interface EnrichmentResult {
  source: string;
  data: Record<string, unknown>;
  success: boolean;
  error?: string;
}

export interface LeadForEnrichment {
  id: string;
  company_name: string;
  domain: string | null;
  city: string | null;
  province: string | null;
}

export interface ContactForEnrichment {
  first_name: string | null;
  last_name: string | null;
  linkedin_url: string | null;
}

export interface EnrichmentSideEffects {
  domain?: string;
  city?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactTitle?: string | null;
  contactLinkedinUrl?: string | null;
}

export interface EnrichmentOutput {
  results: EnrichmentResult[];
  sideEffects: EnrichmentSideEffects;
}

async function safeEnrich<T>(source: string, fn: () => Promise<T>): Promise<EnrichmentResult> {
  try {
    const data = await fn();
    return { source, data: data as unknown as Record<string, unknown>, success: true };
  } catch (err) {
    return { source, data: {}, success: false, error: String(err) };
  }
}

function applyApolloSideEffects(
  result: EnrichmentResult,
  lead: LeadForEnrichment,
  sideEffects: EnrichmentSideEffects,
): void {
  if (!result.success) return;
  const d = result.data as unknown as ApolloMatchResult;
  if (d.website_url && !lead.domain) {
    sideEffects.domain = d.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }
  sideEffects.contactEmail = d.email;
  sideEffects.contactPhone = d.phone;
  sideEffects.contactTitle = d.title;
  sideEffects.contactLinkedinUrl = d.linkedin_url;
}

function applyBraveDomain(
  result: EnrichmentResult,
  lead: LeadForEnrichment,
  sideEffects: EnrichmentSideEffects,
): void {
  if (!result.success || lead.domain || sideEffects.domain) return;
  const website = (result.data as { website?: string }).website;
  if (website) {
    try {
      sideEffects.domain = new URL(website).hostname;
    } catch {
      /* skip */
    }
  }
}

export async function enrichLead(
  lead: LeadForEnrichment,
  contact: ContactForEnrichment | null,
): Promise<EnrichmentOutput> {
  const results: EnrichmentResult[] = [];
  const sideEffects: EnrichmentSideEffects = {};
  let resolvedCity = lead.city;

  if (contact?.first_name && contact?.last_name) {
    const apolloRes = await safeEnrich('apollo_match', () =>
      enrichFromApolloMatch({
        first_name: contact.first_name!,
        last_name: contact.last_name!,
        organization_name: lead.company_name,
        linkedin_url: contact.linkedin_url,
      }),
    );
    results.push(apolloRes);
    applyApolloSideEffects(apolloRes, lead, sideEffects);
  }

  const braveRes = await safeEnrich('brave', () =>
    enrichFromBrave(lead.company_name, lead.province),
  );
  results.push(braveRes);
  applyBraveDomain(braveRes, lead, sideEffects);

  results.push(await safeEnrich('tavily', () => enrichFromTavily(lead.company_name, resolvedCity)));

  const mapsRes = await safeEnrich('google_maps', () =>
    enrichFromGoogleMaps(lead.company_name, resolvedCity),
  );
  results.push(mapsRes);
  if (mapsRes.success) {
    const city = (mapsRes.data as unknown as GoogleMapsResult).city;
    if (city && !resolvedCity) {
      resolvedCity = city;
      sideEffects.city = city;
    }
  }

  return { results, sideEffects };
}

export function mergeEnrichmentData(
  existing: Record<string, unknown> | null,
  results: EnrichmentResult[],
): Record<string, unknown> {
  const merged = { ...(existing ?? {}) };

  for (const result of results) {
    if (result.success) {
      merged[result.source] = { ...result.data, enriched_at: new Date().toISOString() };
    }
  }

  return merged;
}
