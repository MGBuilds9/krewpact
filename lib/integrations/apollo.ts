const APOLLO_API_URL = 'https://api.apollo.io/api/v1';

export interface ApolloSearchParams {
  person_titles?: string[];
  organization_industry_tag_ids?: string[];
  organization_locations?: string[];
  organization_num_employees_ranges?: string[];
  per_page?: number;
  page?: number;
}

export interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string | null;
  title: string;
  organization?: {
    id: string;
    name: string;
    website_url: string | null;
    industry: string | null;
    estimated_num_employees: number | null;
    city: string | null;
    state: string | null;
  };
  linkedin_url: string | null;
  phone_numbers?: { raw_number: string }[];
}

export async function searchPeople(params: ApolloSearchParams): Promise<ApolloPerson[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) throw new Error('APOLLO_API_KEY not configured');

  const res = await fetch(`${APOLLO_API_URL}/mixed_people/api_search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      ...params,
      per_page: params.per_page ?? 25,
      page: params.page ?? 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.matches ?? data.people ?? [];
}

// MDM-specific Apollo search config
export const MDM_APOLLO_CONFIG = {
  industries: ['construction', 'healthcare', 'hospitality', 'retail', 'real estate'],
  locations: ['Ontario, Canada'],
  employeeRanges: ['11,50', '51,200', '201,500'],
  titles: [
    'Owner',
    'CEO',
    'President',
    'VP Operations',
    'Facilities Manager',
    'Property Manager',
    'Director of Construction',
  ],
  perPage: 25,
  maxPagesPerRun: 8, // 200 leads/week = 8 pages * 25
};

export function mapApolloToLead(person: ApolloPerson) {
  return {
    company_name: person.organization?.name ?? `${person.first_name} ${person.last_name}`,
    domain:
      person.organization?.website_url
        ?.replace(/^https?:\/\//, '')
        .replace(/\/$/, '') ?? null,
    industry: person.organization?.industry ?? null,
    source_channel: 'apollo',
    source_detail: person.id,
    status: 'new' as const,
    project_type: null,
    city: person.organization?.city ?? null,
    province: person.organization?.state ?? 'Ontario',
    estimated_value: null,
  };
}

export function mapApolloToContact(person: ApolloPerson, leadId: string) {
  return {
    lead_id: leadId,
    full_name: person.name,
    first_name: person.first_name,
    last_name: person.last_name,
    email: person.email,
    phone: person.phone_numbers?.[0]?.raw_number ?? null,
    title: person.title,
    linkedin_url: person.linkedin_url,
    is_primary: true,
    is_decision_maker: true,
  };
}
