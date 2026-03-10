import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
  createServiceClient: vi.fn(),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';
import { GET, POST } from '@/app/api/executive/staging/route';

const mockAuth = vi.mocked(auth);
const mockCreateServiceClient = vi.mocked(createServiceClient);

function makeRequest(params: Record<string, string> = {}, body?: unknown) {
  const url = new URL('http://localhost/api/executive/staging');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  if (body) {
    return new NextRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  return new NextRequest(url);
}

function _mockSupabaseChain(data: unknown[], count: number, error: unknown = null) {
  const rangeFn = vi.fn().mockReturnValue({ data, count, error });
  const orderFn = vi.fn().mockReturnValue({ range: rangeFn, data, count, error });
  const eqFn = vi
    .fn()
    .mockReturnValue({ order: orderFn, eq: vi.fn().mockReturnValue({ order: orderFn }) });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn, order: orderFn });
  const insertFn = vi.fn().mockReturnValue({
    select: vi
      .fn()
      .mockReturnValue({ single: vi.fn().mockReturnValue({ data: data[0] ?? null, error }) }),
  });

  return {
    from: vi.fn().mockReturnValue({
      select: selectFn,
      insert: insertFn,
    }),
  };
}

describe('GET /api/executive/staging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks executive role', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      sessionClaims: { krewpact_roles: ['project_manager'] },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('returns 200 with staging documents for executive role', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: {
        krewpact_roles: ['executive'],
        krewpact_org_id: 'org-1',
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const docs = [
      { id: 'doc-1', title: 'SOP Alpha', status: 'pending_review', org_id: 'org-1' },
      { id: 'doc-2', title: 'Strategy Beta', status: 'pending_review', org_id: 'org-1' },
    ];

    const rangeFn = vi.fn().mockReturnValue({ data: docs, count: 2, error: null });
    const orderFn = vi.fn().mockReturnValue({ range: rangeFn });
    const eqStatusFn = vi.fn().mockReturnValue({ order: orderFn });
    const eqOrgFn = vi.fn().mockReturnValue({ eq: eqStatusFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqOrgFn });

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ select: selectFn }),
    } as unknown as Awaited<ReturnType<typeof createServiceClient>>);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(50);
  });
});

describe('POST /api/executive/staging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when executive (non-admin) tries to create', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: { krewpact_roles: ['executive'] },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const res = await POST(
      makeRequest({}, { title: 'Test Doc', raw_content: 'content', source_type: 'upload' }),
    );
    expect(res.status).toBe(403);
  });

  it('returns 201 when admin creates valid staging doc', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_admin',
      sessionClaims: {
        krewpact_roles: ['platform_admin'],
        krewpact_org_id: 'org-1',
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const newDoc = {
      id: 'doc-new',
      title: 'New SOP',
      raw_content: 'raw content here',
      status: 'pending_review',
      org_id: 'org-1',
    };

    const singleFn = vi.fn().mockReturnValue({ data: newDoc, error: null });
    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectAfterInsert });

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ insert: insertFn }),
    } as unknown as Awaited<ReturnType<typeof createServiceClient>>);

    const res = await POST(
      makeRequest({}, { title: 'New SOP', raw_content: 'raw content here', source_type: 'upload' }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('doc-new');
  });

  it('returns 400 on invalid input (empty title)', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_admin',
      sessionClaims: { krewpact_roles: ['platform_admin'] },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const res = await POST(
      makeRequest({}, { title: '', raw_content: 'content', source_type: 'upload' }),
    );
    expect(res.status).toBe(400);
  });
});
