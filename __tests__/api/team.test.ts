import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/team/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

describe('GET /api/team', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);

    const res = await GET(makeRequest('/api/team'));
    expect(res.status).toBe(401);
  });

  it('returns team members with active user_divisions', async () => {
    const members = [
      { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@mdm.com' },
      { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@mdm.com' },
    ];

    mockClerkAuth(mockAuth, 'user_123');
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { users: { data: members, error: null } } }),
    );

    const res = await GET(makeRequest('/api/team'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual(members);
  });

  it('filters by division_id', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    const client = mockSupabaseClient({ tables: { users: { data: [], error: null } } });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(
      makeRequest('/api/team?division_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('users');
  });

  it('supports search param', async () => {
    const members = [{ id: '1', first_name: 'John', last_name: 'Doe', email: 'john@mdm.com' }];

    mockClerkAuth(mockAuth, 'user_123');
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { users: { data: members, error: null } } }),
    );

    const res = await GET(makeRequest('/api/team?search=john'));
    expect(res.status).toBe(200);
  });

  it('returns 500 on Supabase error', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { users: { data: null, error: { message: 'DB error', code: 'PGRST000' } } },
      }),
    );

    const res = await GET(makeRequest('/api/team'));
    expect(res.status).toBe(500);
  });
});
