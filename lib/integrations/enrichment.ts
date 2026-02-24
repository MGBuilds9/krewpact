export interface EnrichmentResult {
  source: string;
  data: Record<string, unknown>;
  success: boolean;
  error?: string;
}

export async function enrichLead(
  leadId: string,
  domain: string | null,
): Promise<EnrichmentResult[]> {
  const results: EnrichmentResult[] = [];

  if (!domain) {
    return results;
  }

  try {
    const googleResult = await enrichFromGoogleMaps(domain);
    results.push({ source: 'google_maps', data: googleResult, success: true });
  } catch (err) {
    results.push({ source: 'google_maps', data: {}, success: false, error: String(err) });
  }

  return results;
}

async function enrichFromGoogleMaps(domain: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return {};

  const url = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
  url.searchParams.set('input', domain);
  url.searchParams.set('inputtype', 'textquery');
  url.searchParams.set('fields', 'formatted_address,name,rating,user_ratings_total,types,business_status');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) return {};

  const data = await res.json();
  const place = data.candidates?.[0];
  if (!place) return {};

  return {
    address: place.formatted_address,
    google_rating: place.rating,
    google_reviews_count: place.user_ratings_total,
    business_types: place.types,
    business_status: place.business_status,
  };
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
