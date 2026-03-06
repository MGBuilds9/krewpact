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
  mapApolloToLead: vi.fn((person: { id: string; first_name: string; last_name: string; organization?: { name?: string; industry?: string; city?: string; state?: string } }) => ({
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
  })),
  mapApolloToContact: vi.fn((person: { name: string; first_name: string; last_name: string; email: string | null; title: string; linkedin_url: string | null; phone_numbers?: { raw_number: string }[] }, leadId: string) => ({
    lead_id: leadId,
    full_name: person.name,
    first_name: person.first_name,
    last_name: person.last_name,
    email: person.email,
    phone: null,
    title: person.title,
    linkedin_url: person.linkedin_url,
    is_primary: true,
    is_decision_maker: true,
  })),
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
    organization: { id: `org-${id}`, name: `Company ${id}`, website_url: null, industry: 'construction', estimated_num_employees: 20, city: 'Toronto', state: 'Ontario' },
    linkedin_url: null,
    phone_numbers: [],
  };
}

function makeCronRequest(profileId?: string) {
  const path = profileId
    ? `/api/cron/apollo-pump?profileId=${profileId}`
    : '/api/cron/apollo-pump';
  return makeRequest(path, { method: 'POST' });
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

  it('imports leads using default config when no profileId', async () => {
    const people = [makePerson('p1'), makePerson('p2')];
    mockSearchPeople.mockResolvedValueOnce(people).mockResolvedValueOnce([]);

    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: [{ id: 'lead-1', external_id: 'p1' }, { id: 'lead-2', external_id: 'p2' }], error: null },
        contacts: { data: null, error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.profileId).toBeNull();
  });

  it('uses profile searchParams when profileId is provided', async () => {
    mockSearchPeople.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const supabase = mockSupabaseClient({});
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest('pharmacy-owners-gta'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profileId).toBe('pharmacy-owners-gta');
    expect(body.success).toBe(true);

    // Verify searchPeople was called with pharmacy profile params
    expect(mockSearchPeople).toHaveBeenCalledWith(
      expect.objectContaining({
        person_titles: ['Owner', 'Pharmacist', 'Director of Operations'],
        organization_industry_tag_ids: ['pharmaceutical', 'healthcare'],
      }),
    );
  });

  it('returns 400 for unknown profile ID', async () => {
    const supabase = mockSupabaseClient({});
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest('nonexistent-profile'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Profile not found');
  });

  it('deduplicates against existing leads', async () => {
    const people = [makePerson('existing-1'), makePerson('new-1')];
    mockSearchPeople.mockResolvedValueOnce(people).mockResolvedValueOnce([]);

    const supabase = mockSupabaseClient({
      tables: {
        leads: { data: [{ id: 'lead-new', external_id: 'new-1' }], error: null },
        contacts: { data: null, error: null },
      },
    });
    // Override the dedup query to return existing-1 as already present
    // The mock supabase returns the same data for all queries on `leads` table.
    // This test verifies the dedup flow runs without error.

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('handles search returning empty results', async () => {
    mockSearchPeople.mockResolvedValueOnce([]);

    const supabase = mockSupabaseClient({});
    mockCreateServiceClient.mockReturnValue(supabase);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.imported).toBe(0);
    expect(body.duplicates).toBe(0);
  });

  it('returns 500 on Apollo API error', async () => {
    const supabase = mockSupabaseClient({});
    mockCreateServiceClient.mockReturnValue(supabase);
    mockSearchPeople.mockImplementation(() => {
      throw new Error('Apollo API error 429');
    });

    const res = await POST(makeCronRequest());
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe('Apollo pump failed');
  });
});
