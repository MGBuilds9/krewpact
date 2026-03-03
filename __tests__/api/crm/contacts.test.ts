import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET, POST } from '@/app/api/crm/contacts/route';
import { GET as GET_ID, PATCH, DELETE } from '@/app/api/crm/contacts/[id]/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  makeContact,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/crm/contacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns contacts list', async () => {
    const contacts = [makeContact(), makeContact({ first_name: 'John' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { contacts: { data: contacts, error: null } } }),
    );

    const res = await GET(makeRequest('/api/crm/contacts'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(contacts);
    expect(typeof body.total).toBe('number');
    expect(typeof body.hasMore).toBe('boolean');
  });

  it('filters by account_id', async () => {
    const contacts = [makeContact()];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({ tables: { contacts: { data: contacts, error: null } } });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(
      makeRequest('/api/crm/contacts?account_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('contacts');
  });

  it('filters by search', async () => {
    const contacts = [makeContact({ first_name: 'Jane' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { contacts: { data: contacts, error: null } } }),
    );

    const res = await GET(makeRequest('/api/crm/contacts?search=Jane'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(contacts);
    expect(typeof body.total).toBe('number');
    expect(typeof body.hasMore).toBe('boolean');
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/contacts'));
    expect(res.status).toBe(401);
  });
});

describe('POST /api/crm/contacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('creates contact', async () => {
    const created = makeContact();
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { contacts: { data: created, error: null } } }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/contacts', {
        first_name: 'Jane',
        last_name: 'Smith',
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.first_name).toBe('Jane');
  });

  it('returns 400 for invalid email', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/contacts', {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'not-an-email',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 without first_name', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(makeJsonRequest('/api/crm/contacts', { last_name: 'Smith' }));
    expect(res.status).toBe(400);
  });

  it('creates contact with is_primary flag', async () => {
    const created = makeContact({ is_primary: true });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { contacts: { data: created, error: null } } }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/contacts', {
        first_name: 'Jane',
        last_name: 'Smith',
        is_primary: true,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.is_primary).toBe(true);
  });
});

describe('GET /api/crm/contacts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns contact by id', async () => {
    const contact = makeContact();
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { contacts: { data: contact, error: null } } }),
    );

    const res = await GET_ID(makeRequest('/api/crm/contacts/123'), makeContext(contact.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.first_name).toBe('Jane');
  });
});

describe('PATCH /api/crm/contacts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('updates contact', async () => {
    const updated = makeContact({ first_name: 'Updated' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { contacts: { data: updated, error: null } } }),
    );

    const res = await PATCH(
      makeJsonRequest('/api/crm/contacts/123', { first_name: 'Updated' }, 'PATCH'),
      makeContext(updated.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.first_name).toBe('Updated');
  });
});

describe('DELETE /api/crm/contacts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('deletes contact', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { contacts: { data: null, error: null } } }),
    );

    const res = await DELETE(makeRequest('/api/crm/contacts/123'), makeContext('some-id'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
