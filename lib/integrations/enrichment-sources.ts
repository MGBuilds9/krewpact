/**
 * Multi-source enrichment functions for the lead enrichment waterfall pipeline.
 * Order: Apollo People Match → Brave Web Search → Tavily AI Search → Google Maps
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApolloMatchInput {
  first_name: string;
  last_name: string;
  organization_name: string;
  linkedin_url?: string | null;
}

export interface ApolloMatchResult {
  email: string | null;
  phone: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  title: string | null;
}

export interface BraveSearchResult {
  website: string | null;
  description: string | null;
  news_snippets: string[];
  social_profiles: string[];
}

export interface TavilySearchResult {
  answer: string | null;
  results: { title: string; url: string; content: string }[];
}

export interface GoogleMapsResult {
  address: string | null;
  city: string | null;
  google_rating: number | null;
  google_reviews_count: number | null;
  business_types: string[] | null;
  business_status: string | null;
}

// ─── Apollo People Match ─────────────────────────────────────────────────────

export async function enrichFromApolloMatch(
  input: ApolloMatchInput,
): Promise<ApolloMatchResult> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) throw new Error('APOLLO_API_KEY not configured');

  const body: Record<string, unknown> = {
    first_name: input.first_name,
    last_name: input.last_name,
    organization_name: input.organization_name,
  };
  if (input.linkedin_url) {
    body.linkedin_url = input.linkedin_url;
  }

  const res = await fetch('https://api.apollo.io/api/v1/people/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo Match API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const person = data.person;
  if (!person) return { email: null, phone: null, website_url: null, linkedin_url: null, title: null };

  return {
    email: person.email ?? null,
    phone: person.phone_numbers?.[0]?.raw_number ?? null,
    website_url: person.organization?.website_url ?? null,
    linkedin_url: person.linkedin_url ?? null,
    title: person.title ?? null,
  };
}

// ─── Brave Web Search ────────────────────────────────────────────────────────

export async function enrichFromBrave(
  companyName: string,
  province: string | null,
): Promise<BraveSearchResult> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) throw new Error('BRAVE_API_KEY not configured');

  const query = `"${companyName}" ${province ?? 'Ontario'} construction`;
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', '5');

  const res = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brave Search API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const webResults = data.web?.results ?? [];
  const newsResults = data.news?.results ?? [];

  // Extract first result as likely company website
  const firstResult = webResults[0];
  const socialDomains = ['linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com'];

  return {
    website: firstResult?.url ?? null,
    description: firstResult?.description ?? null,
    news_snippets: newsResults.slice(0, 3).map((n: { title: string }) => n.title),
    social_profiles: webResults
      .filter((r: { url: string }) => socialDomains.some((d) => r.url.includes(d)))
      .map((r: { url: string }) => r.url)
      .slice(0, 4),
  };
}

// ─── Tavily AI Search ────────────────────────────────────────────────────────

export async function enrichFromTavily(
  companyName: string,
  city: string | null,
): Promise<TavilySearchResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error('TAVILY_API_KEY not configured');

  const location = city ? ` ${city}` : '';
  const query = `"${companyName}"${location} company profile services`;

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily API error ${res.status}: ${text}`);
  }

  const data = await res.json();

  return {
    answer: data.answer ?? null,
    results: (data.results ?? []).slice(0, 5).map(
      (r: { title: string; url: string; content: string }) => ({
        title: r.title,
        url: r.url,
        content: r.content?.slice(0, 500) ?? '',
      }),
    ),
  };
}

// ─── Google Maps Places ──────────────────────────────────────────────────────

export async function enrichFromGoogleMaps(
  companyName: string,
  city: string | null,
): Promise<GoogleMapsResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY not configured');

  const query = city
    ? `"${companyName}" ${city} Ontario`
    : `"${companyName}" Ontario`;

  const url = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
  url.searchParams.set('input', query);
  url.searchParams.set('inputtype', 'textquery');
  url.searchParams.set('fields', 'formatted_address,name,rating,user_ratings_total,types,business_status');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Maps API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const place = data.candidates?.[0];
  if (!place) return { address: null, city: null, google_rating: null, google_reviews_count: null, business_types: null, business_status: null };

  // Try to extract city from formatted_address (e.g. "123 Main St, Mississauga, ON L5B 1M2")
  const addressParts = place.formatted_address?.split(',') ?? [];
  const extractedCity = addressParts.length >= 2 ? addressParts[1]?.trim() ?? null : null;

  return {
    address: place.formatted_address ?? null,
    city: extractedCity,
    google_rating: place.rating ?? null,
    google_reviews_count: place.user_ratings_total ?? null,
    business_types: place.types ?? null,
    business_status: place.business_status ?? null,
  };
}
