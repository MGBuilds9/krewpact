import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/crm/search/route';
import {
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  makeRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

describe('GET /api/crm/search', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 if unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/search?q=test'));
    expect(res.status).toBe(401);
  });

  it('returns empty results for short query', async () => {
    mockClerkAuth(mockAuth);
    const res = await GET(makeRequest('/api/crm/search?q=a'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('returns search results across entity types', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        leads: { data: [{ id: 'l1', company_name: 'Acme', stage: 'new' }], error: null },
        contacts: { data: [{ id: 'c1', first_name: 'John', last_name: 'Doe', email: 'john@acme.com' }], error: null },
        accounts: { data: [], error: null },
        opportunities: { data: [], error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(makeRequest('/api/crm/search?q=acme'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for no match', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        leads: { data: [], error: null },
        contacts: { data: [], error: null },
        accounts: { data: [], error: null },
        opportunities: { data: [], error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(makeRequest('/api/crm/search?q=zzzzz'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });
});
