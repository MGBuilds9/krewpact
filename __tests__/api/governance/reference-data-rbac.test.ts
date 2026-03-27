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

describe('RBAC: GET /api/governance/reference-data', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-platform_admin', async () => {
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { GET } = await import('@/app/api/governance/reference-data/route');
    const res = await GET(makeRequest('/api/governance/reference-data'));
    expect(res.status).toBe(403);
    expect(mockRequireRole).toHaveBeenCalledWith(['platform_admin']);
  });

  it('returns 200 for platform_admin', async () => {
    mockRequireRole.mockResolvedValue({ userId: 'admin-user', roles: ['platform_admin'] });
    mockFrom.mockReturnValue(paginatedChain([], 0));
    const { GET } = await import('@/app/api/governance/reference-data/route');
    const res = await GET(makeRequest('/api/governance/reference-data'));
    expect(res.status).toBe(200);
  });
});

describe('RBAC: POST /api/governance/reference-data', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-platform_admin', async () => {
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { POST } = await import('@/app/api/governance/reference-data/route');
    const res = await POST(makeJsonRequest('/api/governance/reference-data', { set_key: 'x' }));
    expect(res.status).toBe(403);
  });

  it('returns 201 for platform_admin with valid body', async () => {
    mockRequireRole.mockResolvedValue({ userId: 'admin-user', roles: ['platform_admin'] });
    const newRecord = { id: 'ref-1', set_key: 'test_key', set_name: 'Test Set', status: 'draft' };
    mockFrom.mockReturnValue(paginatedChain([newRecord], 1));
    const { POST } = await import('@/app/api/governance/reference-data/route');
    const res = await POST(
      makeJsonRequest('/api/governance/reference-data', {
        set_key: 'test_key',
        set_name: 'Test Set',
      }),
    );
    expect(res.status).toBe(201);
  });
});
