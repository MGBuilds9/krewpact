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
import { GET, POST } from '@/app/api/crm/accounts/route';
import { GET as GET_ID, PATCH, DELETE } from '@/app/api/crm/accounts/[id]/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  makeAccount,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/crm/accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/accounts'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns accounts list', async () => {
    const accounts = [makeAccount(), makeAccount({ account_name: 'Second' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { accounts: { data: accounts, error: null } } }),
    );

    const res = await GET(makeRequest('/api/crm/accounts'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(accounts);
    expect(typeof body.total).toBe('number');
    expect(typeof body.hasMore).toBe('boolean');
  });

  it('filters by division_id', async () => {
    const accounts = [makeAccount()];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({ tables: { accounts: { data: accounts, error: null } } });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(makeRequest('/api/crm/accounts?division_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'));
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('accounts');
  });

  it('filters by search param', async () => {
    const accounts = [makeAccount({ account_name: 'MDM Group' })];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({ tables: { accounts: { data: accounts, error: null } } });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(makeRequest('/api/crm/accounts?search=MDM'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(accounts);
    expect(typeof body.total).toBe('number');
    expect(typeof body.hasMore).toBe('boolean');
  });

  it('returns 500 on database error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { accounts: { data: null, error: { message: 'DB error', code: 'PGRST000' } } },
      }),
    );

    const res = await GET(makeRequest('/api/crm/accounts'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB error');
  });
});

describe('POST /api/crm/accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/accounts', { account_name: 'Test', account_type: 'client' }),
    );
    expect(res.status).toBe(401);
  });

  it('creates account with valid data', async () => {
    const created = makeAccount();
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { accounts: { data: created, error: null } } }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/accounts', {
        account_name: 'Test Account',
        account_type: 'client',
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.account_name).toBe('Test Account Inc.');
  });

  it('returns 400 for missing account_name', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(makeJsonRequest('/api/crm/accounts', { account_type: 'client' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid division_id format', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/accounts', {
        account_name: 'Test',
        account_type: 'client',
        division_id: 'not-a-uuid',
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/crm/accounts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns account by id', async () => {
    const account = makeAccount();
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { accounts: { data: account, error: null } } }),
    );

    const res = await GET_ID(makeRequest('/api/crm/accounts/123'), makeContext(account.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.account_name).toBe('Test Account Inc.');
  });

  it('returns 404 for non-existent account', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          accounts: {
            data: null,
            error: { message: 'Row not found', code: 'PGRST116' },
          },
        },
      }),
    );

    const res = await GET_ID(
      makeRequest('/api/crm/accounts/nonexistent'),
      makeContext('nonexistent'),
    );
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/crm/accounts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('updates account', async () => {
    const updated = makeAccount({ account_name: 'Updated Name' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { accounts: { data: updated, error: null } } }),
    );

    const res = await PATCH(
      makeJsonRequest('/api/crm/accounts/123', { account_name: 'Updated Name' }, 'PATCH'),
      makeContext(updated.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.account_name).toBe('Updated Name');
  });
});

describe('DELETE /api/crm/accounts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('deletes account', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { accounts: { data: null, error: null } } }),
    );

    const res = await DELETE(makeRequest('/api/crm/accounts/123'), makeContext('some-id'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
