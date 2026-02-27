import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/crm/import/route';
import {
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  makeJsonRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

describe('POST /api/crm/import', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 if unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeJsonRequest('/api/crm/import', {
      entity_type: 'lead',
      rows: [{ company_name: 'Test' }],
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 for empty rows', async () => {
    mockClerkAuth(mockAuth);
    const req = makeJsonRequest('/api/crm/import', {
      entity_type: 'lead',
      rows: [],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('imports valid lead rows', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: null, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeJsonRequest('/api/crm/import', {
      entity_type: 'lead',
      rows: [
        { company_name: 'Acme Corp', city: 'Toronto' },
        { company_name: 'Beta Inc', city: 'Mississauga' },
      ],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.imported).toBe(2);
    expect(body.data.skipped).toBe(0);
  });

  it('skips rows with missing company_name', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: null, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeJsonRequest('/api/crm/import', {
      entity_type: 'lead',
      rows: [
        { company_name: 'Valid' },
        { city: 'No Name' },
      ],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.imported).toBe(1);
    expect(body.data.skipped).toBe(1);
  });

  it('applies column mapping', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: null, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeJsonRequest('/api/crm/import', {
      entity_type: 'lead',
      rows: [{ 'Company': 'Mapped Corp', 'Location': 'Ottawa' }],
      column_mapping: { 'Company': 'company_name', 'Location': 'city' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.imported).toBe(1);
  });
});
