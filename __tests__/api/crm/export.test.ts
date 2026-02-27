import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/crm/export/route';
import {
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  makeRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

describe('GET /api/crm/export', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 if unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeRequest('/api/crm/export?entity=leads');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid entity', async () => {
    mockClerkAuth(mockAuth);
    const req = makeRequest('/api/crm/export?entity=invalid');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when entity is missing', async () => {
    mockClerkAuth(mockAuth);
    const req = makeRequest('/api/crm/export');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns CSV with headers and data', async () => {
    mockClerkAuth(mockAuth);
    const rows = [
      { id: '1', company_name: 'Acme Corp', city: 'Toronto' },
      { id: '2', company_name: 'Beta Inc', city: 'Ottawa' },
    ];
    const client = mockSupabaseClient({
      tables: { leads: { data: rows, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeRequest('/api/crm/export?entity=leads');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('leads-export.csv');

    const text = await res.text();
    const lines = text.split('\n');
    expect(lines[0]).toBe('id,company_name,city');
    expect(lines[1]).toBe('1,Acme Corp,Toronto');
    expect(lines[2]).toBe('2,Beta Inc,Ottawa');
  });

  it('escapes CSV values with commas and quotes', async () => {
    mockClerkAuth(mockAuth);
    const rows = [
      { id: '1', company_name: 'Acme, "Corp"', notes: 'line1\nline2' },
    ];
    const client = mockSupabaseClient({
      tables: { leads: { data: rows, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeRequest('/api/crm/export?entity=leads');
    const res = await GET(req);
    const text = await res.text();
    const lines = text.split('\n');
    // Should be properly escaped
    expect(lines[1]).toContain('"Acme, ""Corp"""');
  });

  it('returns empty CSV for no data', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: [], error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeRequest('/api/crm/export?entity=leads');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('');
  });

  it('exports contacts', async () => {
    mockClerkAuth(mockAuth);
    const rows = [
      { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
    ];
    const client = mockSupabaseClient({
      tables: { contacts: { data: rows, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const req = makeRequest('/api/crm/export?entity=contacts');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('first_name,last_name,email');
  });
});
