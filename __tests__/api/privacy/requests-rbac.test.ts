import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireRole = vi.fn();
vi.mock('@/lib/api/org', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn().mockResolvedValue({
    client: { from: (...args: unknown[]) => mockFrom(...args) },
    error: null,
  }),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { NextResponse } from 'next/server';

import { makeJsonRequest, makeRequest } from '@/__tests__/helpers';

function paginatedChain(data: unknown[], count: number) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null });
  chain.then = (resolve: (v: unknown) => void) => resolve({ data, error: null, count });
  return chain;
}

describe('RBAC: GET /api/privacy/requests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-platform_admin', async () => {
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    );
    const { GET } = await import('@/app/api/privacy/requests/route');
    const res = await GET(makeRequest('/api/privacy/requests'));
    expect(res.status).toBe(403);
    expect(mockRequireRole).toHaveBeenCalledWith(['platform_admin']);
  });

  it('returns 200 for platform_admin', async () => {
    mockRequireRole.mockResolvedValue({ userId: 'admin-user', roles: ['platform_admin'] });
    mockFrom.mockReturnValue(paginatedChain([], 0));
    const { GET } = await import('@/app/api/privacy/requests/route');
    const res = await GET(makeRequest('/api/privacy/requests'));
    expect(res.status).toBe(200);
  });
});

describe('RBAC: POST /api/privacy/requests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-platform_admin', async () => {
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    );
    const { POST } = await import('@/app/api/privacy/requests/route');
    const res = await POST(makeJsonRequest('/api/privacy/requests', { requester_email: 'a@b.com' }));
    expect(res.status).toBe(403);
  });

  it('returns 201 for platform_admin with valid body', async () => {
    mockRequireRole.mockResolvedValue({ userId: 'admin-user', roles: ['platform_admin'] });
    const newRequest = { id: 'pr-1', requester_email: 'user@example.com', request_type: 'access', status: 'received' };
    mockFrom.mockReturnValue(paginatedChain([newRequest], 1));
    const { POST } = await import('@/app/api/privacy/requests/route');
    const res = await POST(
      makeJsonRequest('/api/privacy/requests', {
        requester_email: 'user@example.com',
        requester_name: 'Test User',
        request_type: 'access',
        legal_basis: 'PIPEDA s.8',
      }),
    );
    expect(res.status).toBe(201);
  });
});
