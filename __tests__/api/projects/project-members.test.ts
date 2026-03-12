import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { GET, POST, DELETE } from '@/app/api/projects/[id]/members/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  TEST_IDS,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const PROJECT_ID = TEST_IDS.PROJECT_ID;
const USER_ID = TEST_IDS.USER_ID;

function ctx(id: string = PROJECT_ID) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockClerkAuth(mockAuth);
});

// ============================================================
// GET /api/projects/[id]/members
// ============================================================

describe('GET /api/projects/[id]/members', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest(`/api/projects/${PROJECT_ID}/members`), ctx());
    expect(res.status).toBe(401);
  });

  it('returns active members', async () => {
    const members = [
      {
        id: 'mem-1',
        project_id: PROJECT_ID,
        user_id: USER_ID,
        member_role: 'manager',
        left_at: null,
        user: {
          id: USER_ID,
          first_name: 'John',
          last_name: 'Doe',
          email: 'j@test.com',
          avatar_url: null,
        },
      },
    ];
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { project_members: { data: members, error: null } } }),
      error: null,
    });
    const res = await GET(makeRequest(`/api/projects/${PROJECT_ID}/members`), ctx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(members);
  });

  it('returns 500 on DB error', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { project_members: { data: null, error: { message: 'DB err', code: '500' } } },
      }),
      error: null,
    });
    const res = await GET(makeRequest(`/api/projects/${PROJECT_ID}/members`), ctx());
    expect(res.status).toBe(500);
  });
});

// ============================================================
// POST /api/projects/[id]/members
// ============================================================

describe('POST /api/projects/[id]/members', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/members`, { user_id: USER_ID }),
      ctx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid body (missing user_id)', async () => {
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/members`, { member_role: 'worker' }),
      ctx(),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid role', async () => {
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/members`, {
        user_id: USER_ID,
        member_role: 'ceo',
      }),
      ctx(),
    );
    expect(res.status).toBe(400);
  });

  it('adds member with default role', async () => {
    const created = {
      id: 'mem-new',
      project_id: PROJECT_ID,
      user_id: USER_ID,
      member_role: 'worker',
      left_at: null,
      user: {
        id: USER_ID,
        first_name: 'John',
        last_name: 'Doe',
        email: 'j@test.com',
        avatar_url: null,
      },
    };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { project_members: { data: created, error: null } } }),
      error: null,
    });
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/members`, { user_id: USER_ID }),
      ctx(),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.member_role).toBe('worker');
  });

  it('adds member with explicit role', async () => {
    const created = {
      id: 'mem-new',
      project_id: PROJECT_ID,
      user_id: USER_ID,
      member_role: 'supervisor',
      left_at: null,
      user: {
        id: USER_ID,
        first_name: 'John',
        last_name: 'Doe',
        email: 'j@test.com',
        avatar_url: null,
      },
    };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { project_members: { data: created, error: null } } }),
      error: null,
    });
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/members`, {
        user_id: USER_ID,
        member_role: 'supervisor',
      }),
      ctx(),
    );
    expect(res.status).toBe(201);
  });
});

// ============================================================
// DELETE /api/projects/[id]/members
// ============================================================

describe('DELETE /api/projects/[id]/members', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await DELETE(
      makeRequest(`/api/projects/${PROJECT_ID}/members?member_id=mem-1`),
      ctx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when member_id param is missing', async () => {
    const res = await DELETE(makeRequest(`/api/projects/${PROJECT_ID}/members`), ctx());
    expect(res.status).toBe(400);
  });

  it('soft-deletes member (sets left_at)', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ defaultResponse: { data: null, error: null } }),
      error: null,
    });
    const res = await DELETE(
      makeRequest(`/api/projects/${PROJECT_ID}/members?member_id=mem-1`),
      ctx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 500 on DB error', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        defaultResponse: { data: null, error: { message: 'DB error', code: '500' } },
      }),
      error: null,
    });
    const res = await DELETE(
      makeRequest(`/api/projects/${PROJECT_ID}/members?member_id=mem-1`),
      ctx(),
    );
    expect(res.status).toBe(500);
  });
});
