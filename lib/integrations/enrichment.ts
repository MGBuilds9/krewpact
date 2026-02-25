/**
 * Lead enrichment waterfall pipeline.
 * Order: Apollo People Match → Brave Web Search → Tavily AI Search → Google Maps
 * Each source fills gaps the previous didn't. Partial success is fine.
 */

import {
  enrichFromApolloMatch,
  enrichFromBrave,
  enrichFromTavily,
  enrichFromGoogleMaps,
  type ApolloMatchResult,
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

export async function enrichLead(
  lead: LeadForEnrichment,
  contact: ContactForEnrichment | null,
): Promise<EnrichmentOutput> {
  const results: EnrichmentResult[] = [];
  const sideEffects: EnrichmentSideEffects = {};

  // Track city across sources — later sources benefit from earlier finds
  let resolvedCity = lead.city;

  // ── Step 1: Apollo People Match ────────────────────────────────────────
  // Only if we have a contact name to match against
  if (contact?.first_name && contact?.last_name) {
    try {
      const apolloResult: ApolloMatchResult = await enrichFromApolloMatch({
        first_name: contact.first_name,
        last_name: contact.last_name,
        organization_name: lead.company_name,
        linkedin_url: contact.linkedin_url,
      });

      results.push({ source: 'apollo_match', data: apolloResult as unknown as Record<string, unknown>, success: true });

      // Side effects: update lead domain if Apollo found a website
      if (apolloResult.website_url && !lead.domain) {
        sideEffects.domain = apolloResult.website_url
          .replace(/^https?:\/\//, '')
          .replace(/\/$/, '');
      }

      // Side effects: contact data for upsert
      sideEffects.contactEmail = apolloResult.email;
      sideEffects.contactPhone = apolloResult.phone;
      sideEffects.contactTitle = apolloResult.title;
      sideEffects.contactLinkedinUrl = apolloResult.linkedin_url;
    } catch (err) {
      results.push({ source: 'apollo_match', data: {}, success: false, error: String(err) });
    }
  }

  // ── Step 2: Brave Web Search ───────────────────────────────────────────
  try {
    const braveResult = await enrichFromBrave(lead.company_name, lead.province);
    results.push({ source: 'brave', data: braveResult as unknown as Record<string, unknown>, success: true });

    // If we still don't have a domain, try to extract from Brave's first result
    if (!lead.domain && !sideEffects.domain && braveResult.website) {
      try {
        const hostname = new URL(braveResult.website).hostname;
        sideEffects.domain = hostname;
      } catch {
        // URL parse failed, skip
      }
    }
  } catch (err) {
    results.push({ source: 'brave', data: {}, success: false, error: String(err) });
  }

  // ── Step 3: Tavily AI Search ───────────────────────────────────────────
  try {
    const tavilyResult = await enrichFromTavily(lead.company_name, resolvedCity);
    results.push({ source: 'tavily', data: tavilyResult as unknown as Record<string, unknown>, success: true });
  } catch (err) {
    results.push({ source: 'tavily', data: {}, success: false, error: String(err) });
  }

  // ── Step 4: Google Maps Places ─────────────────────────────────────────
  try {
    const mapsResult: GoogleMapsResult = await enrichFromGoogleMaps(lead.company_name, resolvedCity);
    results.push({ source: 'google_maps', data: mapsResult as unknown as Record<string, unknown>, success: true });

    // Side effect: if Google Maps found a city and we didn't have one
    if (mapsResult.city && !resolvedCity) {
      resolvedCity = mapsResult.city;
      sideEffects.city = mapsResult.city;
    }
  } catch (err) {
    results.push({ source: 'google_maps', data: {}, success: false, error: String(err) });
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
