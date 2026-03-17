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
  seniority: string | null;
  departments: string[] | null;
  employees: number | null;
  annual_revenue: number | null;
  founded_year: number | null;
  technologies: string[] | null;
  org_linkedin: string | null;
  org_industry: string | null;
  org_city: string | null;
  org_state: string | null;
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

const NULL_APOLLO_RESULT: ApolloMatchResult = {
  email: null,
  phone: null,
  website_url: null,
  linkedin_url: null,
  title: null,
  seniority: null,
  departments: null,
  employees: null,
  annual_revenue: null,
  founded_year: null,
  technologies: null,
  org_linkedin: null,
  org_industry: null,
  org_city: null,
  org_state: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApolloOrg(rawOrg: any) {
  const org = rawOrg ?? {};
  return {
    website_url: org.website_url ?? null,
    employees: org.estimated_num_employees ?? null,
    annual_revenue: org.annual_revenue ?? null,
    founded_year: org.founded_year ?? null,
    technologies: org.technologies ?? null,
    org_linkedin: org.linkedin_url ?? null,
    org_industry: org.industry ?? null,
    org_city: org.city ?? null,
    org_state: org.state ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApolloPerson(person: any): ApolloMatchResult {
  return {
    email: person.email ?? null,
    phone: person.phone_numbers?.[0]?.raw_number ?? null,
    linkedin_url: person.linkedin_url ?? null,
    title: person.title ?? null,
    seniority: person.seniority ?? null,
    departments: person.departments ?? null,
    ...mapApolloOrg(person.organization),
  };
}

export async function enrichFromApolloMatch(input: ApolloMatchInput): Promise<ApolloMatchResult> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) throw new Error('APOLLO_API_KEY not configured');

  const body: Record<string, unknown> = {
    first_name: input.first_name,
    last_name: input.last_name,
    organization_name: input.organization_name,
  };
  if (input.linkedin_url) body.linkedin_url = input.linkedin_url;

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
  return person ? mapApolloPerson(person) : NULL_APOLLO_RESULT;
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
      Accept: 'application/json',
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
    results: (data.results ?? [])
      .slice(0, 5)
      .map((r: { title: string; url: string; content: string }) => ({
        title: r.title,
        url: r.url,
        content: r.content?.slice(0, 500) ?? '',
      })),
  };
}

// ─── Google Maps Places ──────────────────────────────────────────────────────

const NULL_MAPS_RESULT: GoogleMapsResult = {
  address: null,
  city: null,
  google_rating: null,
  google_reviews_count: null,
  business_types: null,
  business_status: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGooglePlace(place: any): GoogleMapsResult {
  const addressParts = place.formatted_address?.split(',') ?? [];
  const extractedCity = addressParts.length >= 2 ? (addressParts[1]?.trim() ?? null) : null;
  return {
    address: place.formatted_address ?? null,
    city: extractedCity,
    google_rating: place.rating ?? null,
    google_reviews_count: place.user_ratings_total ?? null,
    business_types: place.types ?? null,
    business_status: place.business_status ?? null,
  };
}

function buildMapsUrl(query: string, apiKey: string): string {
  const url = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
  url.searchParams.set('input', query);
  url.searchParams.set('inputtype', 'textquery');
  url.searchParams.set(
    'fields',
    'formatted_address,name,rating,user_ratings_total,types,business_status',
  );
  url.searchParams.set('key', apiKey);
  return url.toString();
}

export async function enrichFromGoogleMaps(
  companyName: string,
  city: string | null,
): Promise<GoogleMapsResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY not configured');

  const query = city ? `"${companyName}" ${city} Ontario` : `"${companyName}" Ontario`;
  const res = await fetch(buildMapsUrl(query, apiKey));
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Maps API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const place = data.candidates?.[0];
  return place ? mapGooglePlace(place) : NULL_MAPS_RESULT;
}
