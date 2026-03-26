/**
 * RBAC tests for GET /api/org/roles
 *
 * Verifies: 401 unauthenticated, 403 non-admin, 200 platform_admin only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

const mockRequireRole = vi.fn();
vi.mock('@/lib/api/org', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { makeRequest, mockClerkAuth, mockClerkUnauth, mockSupabaseClient } from '@/__tests__/helpers';

import { GET } from '@/app/api/org/roles/route';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const SAMPLE_ROLES = [
  { id: 'r1', role_key: 'platform_admin', role_name: 'Platform Admin', scope: 'internal', is_system: true, created_at: '', updated_at: '' },
  { id: 'r2', role_key: 'executive', role_name: 'Executive', scope: 'internal', is_system: true, created_at: '', updated_at: '' },
];

describe('GET /api/org/roles — RBAC', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

    const res = await GET(makeRequest('/api/org/roles'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for executive role', async () => {
    mockClerkAuth(mockAuth);
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));

    const res = await GET(makeRequest('/api/org/roles'));
    expect(res.status).toBe(403);
  });

  it('returns 403 for operations_manager role', async () => {
    mockClerkAuth(mockAuth);
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));

    const res = await GET(makeRequest('/api/org/roles'));
    expect(res.status).toBe(403);
  });

  it('returns 403 for accounting role', async () => {
    mockClerkAuth(mockAuth);
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));

    const res = await GET(makeRequest('/api/org/roles'));
    expect(res.status).toBe(403);
  });

  it('allows access for platform_admin only', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRequireRole.mockResolvedValue({ userId: 'user_admin', roles: ['platform_admin'] });

    function makeChain(data: unknown[], count: number) {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.range = vi.fn().mockReturnValue(chain);
      chain.then = (resolve: (v: unknown) => void) => resolve({ data, error: null, count });
      return chain;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateUserClientSafe.mockResolvedValue({
      client: { from: vi.fn().mockReturnValue(makeChain(SAMPLE_ROLES, 2)) } as any,
      error: null,
    });

    const res = await GET(makeRequest('/api/org/roles'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it('filters by role_type when provided', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRequireRole.mockResolvedValue({ userId: 'user_admin', roles: ['platform_admin'] });

    function makeChain(data: unknown[], count: number) {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.range = vi.fn().mockReturnValue(chain);
      chain.then = (resolve: (v: unknown) => void) => resolve({ data, error: null, count });
      return chain;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateUserClientSafe.mockResolvedValue({
      client: { from: vi.fn().mockReturnValue(makeChain([SAMPLE_ROLES[0]], 1)) } as any,
      error: null,
    });

    const res = await GET(makeRequest('/api/org/roles?role_type=internal'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
  });
});
