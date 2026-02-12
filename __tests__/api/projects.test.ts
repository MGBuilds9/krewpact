import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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
import { GET, POST } from '@/app/api/projects/route';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as never);
}

function mockSupabaseChain(data: unknown, error: unknown = null) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  // For queries without .single()
  chain.order = vi.fn().mockReturnValue({
    ...chain,
    eq: vi.fn().mockReturnValue({
      ...chain,
      limit: vi.fn().mockResolvedValue({ data, error }),
      then: undefined,
    }),
    limit: vi.fn().mockResolvedValue({ data, error }),
    then: undefined,
  });

  // Override: if no limit/eq is called after order, resolve directly
  const orderResult = {
    eq: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data, error }),
      then: (resolve: (v: unknown) => void) => resolve({ data, error }),
    }),
    limit: vi.fn().mockResolvedValue({ data, error }),
    then: (resolve: (v: unknown) => void) => resolve({ data, error }),
  };
  chain.order = vi.fn().mockReturnValue(orderResult);

  return chain as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>;
}

describe('GET /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);

    const res = await GET(makeRequest('/api/projects'));
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid query params', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_123' } as Awaited<ReturnType<typeof auth>>);

    const res = await GET(makeRequest('/api/projects?limit=-5'));
    expect(res.status).toBe(400);
  });

  it('returns projects when authenticated', async () => {
    const mockProjects = [
      { id: '1', name: 'Project A', status: 'active' },
      { id: '2', name: 'Project B', status: 'completed' },
    ];

    mockAuth.mockResolvedValue({ userId: 'user_123' } as Awaited<ReturnType<typeof auth>>);
    mockCreateUserClient.mockResolvedValue(mockSupabaseChain(mockProjects));

    const res = await GET(makeRequest('/api/projects'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual(mockProjects);
  });

  it('returns 500 when Supabase errors', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_123' } as Awaited<ReturnType<typeof auth>>);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseChain(null, { message: 'Database error', code: 'PGRST000' }),
    );

    const res = await GET(makeRequest('/api/projects'));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Database error');
  });
});

describe('POST /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);

    const res = await POST(
      makeRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid body', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_123' } as Awaited<ReturnType<typeof auth>>);

    const res = await POST(
      makeRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('creates a project with valid data', async () => {
    const created = { id: '3', name: 'New Project', status: null };

    mockAuth.mockResolvedValue({ userId: 'user_123' } as Awaited<ReturnType<typeof auth>>);

    const chain = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: created, error: null }),
    };
    mockCreateUserClient.mockResolvedValue(chain as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>);

    const res = await POST(
      makeRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Project' }),
      }),
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.name).toBe('New Project');
  });
});
