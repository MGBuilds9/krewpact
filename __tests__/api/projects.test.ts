import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeProject,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  TEST_IDS,
} from '@/__tests__/helpers';
import { DELETE, GET as GET_BY_ID, PATCH } from '@/app/api/projects/[id]/route';
import { GET, POST } from '@/app/api/projects/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

describe('GET /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);

    const res = await GET(makeRequest('/api/projects'));
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for invalid query params', async () => {
    mockClerkAuth(mockAuth, 'user_123');

    const res = await GET(makeRequest('/api/projects?limit=-5'));
    expect(res.status).toBe(400);
  });

  it('returns projects when authenticated', async () => {
    const mockProjects = [
      makeProject({ project_name: 'Project A', status: 'active' }),
      makeProject({ project_name: 'Project B', status: 'closed' }),
    ];

    mockClerkAuth(mockAuth, 'user_123');
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { projects: { data: mockProjects, error: null } } }),
      error: null,
    });

    const res = await GET(makeRequest('/api/projects'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual(mockProjects);
  });

  it('filters by division_id', async () => {
    const mockProjects = [makeProject({ division_id: TEST_IDS.DIVISION_ID })];

    mockClerkAuth(mockAuth, 'user_123');
    const client = mockSupabaseClient({
      tables: { projects: { data: mockProjects, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest(`/api/projects?division_id=${TEST_IDS.DIVISION_ID}`));
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('projects');
  });

  it('returns 500 when Supabase errors', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          projects: { data: null, error: { message: 'Database error', code: 'PGRST000' } },
        },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/projects'));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error.code).toBe('DB_ERROR');
  });

  it('filters by status', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    const client = mockSupabaseClient({ tables: { projects: { data: [], error: null } } });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/projects?status=active'));
    expect(res.status).toBe(200);
  });

  it('supports search param', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    const client = mockSupabaseClient({ tables: { projects: { data: [], error: null } } });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/projects?search=renovation'));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);

    const res = await POST(
      makeJsonRequest('/api/projects', {
        project_name: 'Test',
        project_number: 'PRJ-001',
        division_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid body (missing project_name)', async () => {
    mockClerkAuth(mockAuth, 'user_123');

    const res = await POST(
      makeJsonRequest('/api/projects', {
        project_number: 'PRJ-001',
        division_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing division_id', async () => {
    mockClerkAuth(mockAuth, 'user_123');

    const res = await POST(
      makeJsonRequest('/api/projects', {
        project_name: 'New Project',
        project_number: 'PRJ-001',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('creates a project with valid data', async () => {
    const created = makeProject({ project_name: 'New Project' });

    mockClerkAuth(mockAuth, 'user_123');
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { projects: { data: created, error: null } } }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/projects', {
        project_name: 'New Project',
        project_number: 'PRJ-001',
        division_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      }),
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.project_name).toBe('New Project');
  });
});

describe('GET /api/projects/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns project by ID', async () => {
    const project = makeProject();
    mockClerkAuth(mockAuth, 'user_123');
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { projects: { data: project, error: null } } }),
      error: null,
    });

    const res = await GET_BY_ID(makeRequest('/api/projects/some-id'), {
      params: Promise.resolve({ id: 'some-id' }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 404 for non-existent project', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { projects: { data: null, error: { message: 'Not found', code: 'PGRST116' } } },
      }),
      error: null,
    });

    const res = await GET_BY_ID(makeRequest('/api/projects/missing-id'), {
      params: Promise.resolve({ id: 'missing-id' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/projects/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates project with valid data', async () => {
    const updated = makeProject({ project_name: 'Updated' });
    mockClerkAuth(mockAuth, 'user_123');
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { projects: { data: updated, error: null } } }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest('/api/projects/some-id', { project_name: 'Updated' }, 'PATCH'),
      { params: Promise.resolve({ id: 'some-id' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.project_name).toBe('Updated');
  });
});

describe('DELETE /api/projects/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes project', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { projects: { data: null, error: null } } }),
      error: null,
    });

    const res = await DELETE(makeRequest('/api/projects/some-id'), {
      params: Promise.resolve({ id: 'some-id' }),
    });
    expect(res.status).toBe(200);
  });
});
