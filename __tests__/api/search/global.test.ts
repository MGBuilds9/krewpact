import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { GET } from '@/app/api/search/global/route';
import {
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  makeRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function emptyTables() {
  return {
    leads: { data: [], error: null },
    accounts: { data: [], error: null },
    contacts: { data: [], error: null },
    opportunities: { data: [], error: null },
    estimates: { data: [], error: null },
    projects: { data: [], error: null },
    tasks: { data: [], error: null },
  };
}

describe('GET /api/search/global', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 if unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/search/global?q=test'));
    expect(res.status).toBe(401);
  });

  it('returns empty results for missing query', async () => {
    mockClerkAuth(mockAuth);
    const res = await GET(makeRequest('/api/search/global'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.leads).toEqual([]);
    expect(body.results.accounts).toEqual([]);
    expect(body.results.contacts).toEqual([]);
    expect(body.results.opportunities).toEqual([]);
    expect(body.results.estimates).toEqual([]);
    expect(body.results.projects).toEqual([]);
    expect(body.results.tasks).toEqual([]);
  });

  it('returns empty results for query shorter than 2 chars', async () => {
    mockClerkAuth(mockAuth);
    const res = await GET(makeRequest('/api/search/global?q=a'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.leads).toEqual([]);
  });

  it('returns empty results for whitespace-only query', async () => {
    mockClerkAuth(mockAuth);
    const res = await GET(makeRequest('/api/search/global?q=%20%20'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.leads).toEqual([]);
  });

  it('returns results across all entity types', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        leads: {
          data: [{ id: 'l1', company_name: 'Acme Corp', status: 'new' }],
          error: null,
        },
        accounts: {
          data: [{ id: 'a1', account_name: 'Acme Industries', industry: 'Construction' }],
          error: null,
        },
        contacts: {
          data: [{ id: 'c1', first_name: 'Alice', last_name: 'Acme', email: 'alice@acme.com' }],
          error: null,
        },
        opportunities: {
          data: [{ id: 'o1', opportunity_name: 'Acme Reno', stage: 'proposal' }],
          error: null,
        },
        estimates: {
          data: [{ id: 'e1', estimate_number: 'EST-ACME-001', status: 'draft' }],
          error: null,
        },
        projects: {
          data: [
            {
              id: 'p1',
              project_name: 'Acme HQ Build',
              project_number: 'PRJ-001',
              status: 'active',
            },
          ],
          error: null,
        },
        tasks: {
          data: [{ id: 't1', title: 'Acme drywall', status: 'todo', project_id: 'p1' }],
          error: null,
        },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/search/global?q=acme'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.results.leads).toEqual([{ id: 'l1', name: 'Acme Corp', subtitle: 'new' }]);
    expect(body.results.accounts).toEqual([
      { id: 'a1', name: 'Acme Industries', subtitle: 'Construction' },
    ]);
    expect(body.results.contacts).toEqual([
      { id: 'c1', name: 'Alice Acme', subtitle: 'alice@acme.com' },
    ]);
    expect(body.results.opportunities).toEqual([
      { id: 'o1', name: 'Acme Reno', subtitle: 'proposal' },
    ]);
    expect(body.results.estimates).toEqual([{ id: 'e1', name: 'EST-ACME-001', subtitle: 'draft' }]);
    expect(body.results.projects).toEqual([
      { id: 'p1', name: 'Acme HQ Build', subtitle: 'active' },
    ]);
    expect(body.results.tasks).toEqual([{ id: 't1', name: 'Acme drywall', subtitle: 'todo' }]);
  });

  it('returns empty arrays when no matches found', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({ tables: emptyTables() });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/search/global?q=zzzzz'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.leads).toEqual([]);
    expect(body.results.accounts).toEqual([]);
    expect(body.results.contacts).toEqual([]);
    expect(body.results.opportunities).toEqual([]);
    expect(body.results.estimates).toEqual([]);
    expect(body.results.projects).toEqual([]);
    expect(body.results.tasks).toEqual([]);
  });

  it('handles null fields gracefully', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        ...emptyTables(),
        leads: {
          data: [{ id: 'l1', company_name: null, status: null }],
          error: null,
        },
        contacts: {
          data: [{ id: 'c1', first_name: null, last_name: null, email: null }],
          error: null,
        },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/search/global?q=test'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.leads[0].name).toBe('Unknown');
    expect(body.results.leads[0].subtitle).toBeNull();
    expect(body.results.contacts[0].name).toBe('Unknown');
    expect(body.results.contacts[0].subtitle).toBeNull();
  });

  it('handles partial contact names', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        ...emptyTables(),
        contacts: {
          data: [{ id: 'c1', first_name: 'Alice', last_name: null, email: 'a@b.com' }],
          error: null,
        },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/search/global?q=alice'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.contacts[0].name).toBe('Alice');
  });

  it('handles database errors gracefully', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        leads: { data: null, error: { message: 'DB error' } },
        accounts: { data: null, error: { message: 'DB error' } },
        contacts: { data: null, error: { message: 'DB error' } },
        opportunities: { data: null, error: { message: 'DB error' } },
        estimates: { data: null, error: { message: 'DB error' } },
        projects: { data: null, error: { message: 'DB error' } },
        tasks: { data: null, error: { message: 'DB error' } },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/search/global?q=test'));
    expect(res.status).toBe(200);
    const body = await res.json();
    // All arrays should be empty (not crash), thanks to ?? [] fallback
    expect(body.results.leads).toEqual([]);
    expect(body.results.tasks).toEqual([]);
  });

  it('calls supabase with correct ilike patterns', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({ tables: emptyTables() });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    await GET(makeRequest('/api/search/global?q=test'));

    // Verify from was called for all 7 tables
    expect(client.from).toHaveBeenCalledWith('leads');
    expect(client.from).toHaveBeenCalledWith('accounts');
    expect(client.from).toHaveBeenCalledWith('contacts');
    expect(client.from).toHaveBeenCalledWith('opportunities');
    expect(client.from).toHaveBeenCalledWith('estimates');
    expect(client.from).toHaveBeenCalledWith('projects');
    expect(client.from).toHaveBeenCalledWith('tasks');
  });

  it('returns correct structure shape', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({ tables: emptyTables() });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/search/global?q=test'));
    const body = await res.json();

    expect(body).toHaveProperty('results');
    expect(body.results).toHaveProperty('leads');
    expect(body.results).toHaveProperty('accounts');
    expect(body.results).toHaveProperty('contacts');
    expect(body.results).toHaveProperty('opportunities');
    expect(body.results).toHaveProperty('estimates');
    expect(body.results).toHaveProperty('projects');
    expect(body.results).toHaveProperty('tasks');
  });

  it('returns results with only matching entity types populated', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        ...emptyTables(),
        projects: {
          data: [
            {
              id: 'p1',
              project_name: 'Highway 401 Extension',
              project_number: 'PRJ-401',
              status: 'active',
            },
          ],
          error: null,
        },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/search/global?q=highway'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.results.projects).toHaveLength(1);
    expect(body.results.projects[0].name).toBe('Highway 401 Extension');
    expect(body.results.leads).toEqual([]);
    expect(body.results.accounts).toEqual([]);
    expect(body.results.contacts).toEqual([]);
    expect(body.results.opportunities).toEqual([]);
    expect(body.results.estimates).toEqual([]);
    expect(body.results.tasks).toEqual([]);
  });
});
