import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockVerifyCronAuth = vi.fn();
vi.mock('@/lib/api/cron-auth', () => ({
  verifyCronAuth: (...args: unknown[]) => mockVerifyCronAuth(...args),
}));

const mockSearchPeople = vi.fn();
vi.mock('@/lib/integrations/apollo', () => ({
  searchPeople: (...args: unknown[]) => mockSearchPeople(...args),
  MDM_APOLLO_CONFIG: {
    industries: ['construction'],
    locations: ['Ontario, Canada'],
    employeeRanges: ['11,50'],
    titles: ['Owner', 'CEO'],
    perPage: 25,
    maxPagesPerRun: 2,
  },
  mapApolloToLead: vi.fn(
    (person: {
      id: string;
      first_name: string;
      last_name: string;
      seniority?: string | null;
      departments?: string[] | null;
      organization?: {
        name?: string;
        industry?: string;
        city?: string;
        state?: string;
        estimated_num_employees?: number | null;
        annual_revenue?: number | null;
        founded_year?: number | null;
        technologies?: string[] | null;
        keywords?: string[] | null;
        linkedin_url?: string | null;
      };
    }) => ({
      company_name: person.organization?.name ?? `${person.first_name} ${person.last_name}`,
      domain: null,
      industry: person.organization?.industry ?? null,
      source_channel: 'apollo',
      source_detail: person.id,
      status: 'new',
      project_type: null,
      city: person.organization?.city ?? null,
      province: person.organization?.state ?? 'Ontario',
      estimated_value: null,
      enrichment_data: {
        apollo_search: {
          employees: person.organization?.estimated_num_employees ?? null,
          annual_revenue: person.organization?.annual_revenue ?? null,
          founded_year: person.organization?.founded_year ?? null,
          technologies: person.organization?.technologies ?? null,
          org_keywords: person.organization?.keywords ?? null,
          org_linkedin: person.organization?.linkedin_url ?? null,
          seniority: person.seniority ?? null,
          departments: person.departments ?? null,
          enriched_at: new Date().toISOString(),
        },
      },
    }),
  ),
  mapApolloToContact: vi.fn(
    (
      person: {
        name: string;
        first_name: string;
        last_name: string;
        email: string | null;
        title: string;
        linkedin_url: string | null;
        seniority?: string | null;
        departments?: string[] | null;
        phone_numbers?: { raw_number: string; type?: string }[];
      },
      leadId: string,
    ) => ({
      lead_id: leadId,
      full_name: person.name,
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      phone: person.phone_numbers?.[0]?.raw_number ?? null,
      title: person.title,
      linkedin_url: person.linkedin_url,
      seniority: person.seniority ?? null,
      departments: person.departments?.join(', ') ?? null,
      is_primary: true,
      is_decision_maker: true,
    }),
  ),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/cron/apollo-pump/route';
import { mockSupabaseClient, makeRequest } from '@/__tests__/helpers';

const mockCreateServiceClient = vi.mocked(createServiceClient);

function makePerson(id: string, name: string = 'Test Person') {
  return {
    id,
    first_name: name.split(' ')[0],
    last_name: name.split(' ')[1] ?? 'Doe',
    name,
    email: `${id}@test.com`,
    title: 'Owner',
    seniority: 'owner',
    departments: ['operations'],
    headline: null,
    organization: {
      id: `org-${id}`,
      name: `Company ${id}`,
      website_url: null,
      industry: 'construction',
      estimated_num_employees: 20,
      annual_revenue: null,
      founded_year: null,
      city: 'Toronto',
      state: 'Ontario',
      country: 'Canada',
      linkedin_url: null,
      technologies: null,
      keywords: null,
    },
    linkedin_url: null,
    phone_numbers: [],
  };
}

function makeCronRequest(profileId?: string) {
  const path = profileId ? `/api/cron/apollo-pump?profileId=${profileId}` : '/api/cron/apollo-pump';
  return makeRequest(path, { method: 'POST' });
}

/** Build a supabase mock that handles all the tables the pump touches. */
function makeFullSupabaseMock(options: {
  stateData?: { last_page: number; credits_used_this_month: number; month_reset_at: string } | null;
  insertedLeads?: { id: string; external_id: string }[];
} = {}) {
  const { stateData = null, insertedLeads = [] } = options;
  return mockSupabaseClient({
    tables: {
      apollo_pump_state: { data: stateData, error: null },
      apollo_profile_runs: { data: null, error: null },
      leads: {
        data: insertedLeads,
        error: null,
      },
      contacts: { data: null, error: null },
    },
  });
}

describe('POST /api/cron/apollo-pump', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockVerifyCronAuth.mockResolvedValue({ authorized: true });
    mockSearchPeople.mockReset();
  });

  it('returns 401 when cron auth fails', async () => {
    mockVerifyCronAuth.mockResolvedValue({ authorized: false });
    const res = await POST(makeCronRequest());
    expect(res.status).toBe(401);
  });

  it('returns 400 for unknown profile ID', async () => {
    const supabase = makeFullSupabaseMock();
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest('nonexistent-profile'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Profile not found');
  });

  it('runs single-profile mode when profileId query param is provided', async () => {
    mockSearchPeople.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const supabase = makeFullSupabaseMock();
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest('contracting-pharmacy-healthcare-on'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.mode).toBe('single-profile');
    expect(Array.isArray(body.profiles)).toBe(true);
    expect(body.profiles).toHaveLength(1);
    expect(body.profiles[0].profileId).toBe('contracting-pharmacy-healthcare-on');
  });

  it('single-profile response includes divisionCode', async () => {
    mockSearchPeople.mockResolvedValueOnce([]);

    const supabase = makeFullSupabaseMock();
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest('contracting-pharmacy-healthcare-on'));
    const body = await res.json();
    expect(body.profiles[0].divisionCode).toBe('contracting');
  });

  it('single-profile response shape has leadsFound, leadsImported, duplicatesSkipped', async () => {
    mockSearchPeople.mockResolvedValueOnce([]);

    const supabase = makeFullSupabaseMock();
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest('contracting-commercial-developers-gta'));
    const body = await res.json();
    const profile = body.profiles[0];
    expect(typeof profile.leadsFound).toBe('number');
    expect(typeof profile.leadsImported).toBe('number');
    expect(typeof profile.duplicatesSkipped).toBe('number');
    expect(typeof profile.pageStart).toBe('number');
    expect(typeof profile.pageEnd).toBe('number');
  });

  it('auto-rotation mode response includes mode, weekNumber, profiles array', async () => {
    // Return empty results so profiles finish quickly
    mockSearchPeople.mockResolvedValue([]);

    const supabase = makeFullSupabaseMock();
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mode).toBe('auto-rotation');
    expect(typeof body.weekNumber).toBe('number');
    expect(Array.isArray(body.profiles)).toBe(true);
  });

  it('auto-rotation response includes totalImported and totalDuplicates', async () => {
    mockSearchPeople.mockResolvedValue([]);

    const supabase = makeFullSupabaseMock();
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest());
    const body = await res.json();
    expect(typeof body.totalImported).toBe('number');
    expect(typeof body.totalDuplicates).toBe('number');
    expect(typeof body.profilesRun).toBe('number');
    expect(typeof body.profilesFailed).toBe('number');
  });

  it('imports leads in single-profile mode and returns correct counts', async () => {
    const people = [makePerson('p1'), makePerson('p2')];
    mockSearchPeople.mockResolvedValueOnce(people).mockResolvedValueOnce([]);

    const supabase = makeFullSupabaseMock({
      insertedLeads: [
        { id: 'lead-1', external_id: 'p1' },
        { id: 'lead-2', external_id: 'p2' },
      ],
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest('contracting-commercial-developers-gta'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.mode).toBe('single-profile');
    expect(body.profiles[0].leadsFound).toBe(2);
  });

  it('handles search returning empty results gracefully', async () => {
    mockSearchPeople.mockResolvedValueOnce([]);

    const supabase = makeFullSupabaseMock();
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest('contracting-commercial-developers-gta'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.profiles[0].leadsFound).toBe(0);
    expect(body.profiles[0].leadsImported).toBe(0);
  });

  it('returns 500 on Apollo API error in single-profile mode', async () => {
    const supabase = makeFullSupabaseMock();
    mockCreateServiceClient.mockReturnValue(supabase);
    mockSearchPeople.mockImplementation(() => {
      throw new Error('Apollo API error 429');
    });

    const res = await POST(makeCronRequest('contracting-commercial-developers-gta'));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe('Apollo pump failed');
  });

  it('includes timestamp in response', async () => {
    mockSearchPeople.mockResolvedValue([]);

    const supabase = makeFullSupabaseMock();
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest('contracting-commercial-developers-gta'));
    const body = await res.json();
    expect(body.timestamp).toBeTruthy();
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });
});
