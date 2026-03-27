import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
  createServiceClient: vi.fn(),
}));
vi.mock('@/lib/api/org', () => ({
  getOrgIdFromAuth: vi.fn().mockResolvedValue('org-1'),
  getKrewpactRoles: vi.fn(),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), child: vi.fn().mockReturnThis() },
}));
vi.mock('@/lib/request-context', () => ({
  generateRequestId: vi.fn().mockReturnValue('test-request-id'),
  requestContext: { run: vi.fn().mockImplementation((_ctx, fn) => fn()) },
}));

import { auth } from '@clerk/nextjs/server';

import { GET, POST } from '@/app/api/executive/staging/route';
import { getKrewpactRoles } from '@/lib/api/org';
import { createServiceClient } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockGetKrewpactRoles = vi.mocked(getKrewpactRoles);

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
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when user lacks executive role', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      sessionClaims: {
        sub: 'user_123',
        metadata: { krewpact_user_id: 'user_123', role_keys: ['project_manager'] },
        krewpact_user_id: 'user_123',
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetKrewpactRoles.mockResolvedValue(['project_manager']);

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.message).toContain('Forbidden');
  });

  it('returns 200 with staging documents for executive role', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: {
        sub: 'user_exec',
        metadata: {
          krewpact_user_id: 'user_exec',
          krewpact_org_id: 'org-1',
          role_keys: ['executive'],
        },
        krewpact_user_id: 'user_exec',
        krewpact_org_id: 'org-1',
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetKrewpactRoles.mockResolvedValue(['executive']);

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
      sessionClaims: {
        sub: 'user_exec',
        metadata: { krewpact_user_id: 'user_exec', role_keys: ['executive'] },
        krewpact_user_id: 'user_exec',
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetKrewpactRoles.mockResolvedValue(['executive']);

    const res = await POST(
      makeRequest({}, { title: 'Test Doc', raw_content: 'content', source_type: 'upload' }),
    );
    expect(res.status).toBe(403);
  });

  it('returns 201 when admin creates valid staging doc', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_admin',
      sessionClaims: {
        sub: 'user_admin',
        metadata: {
          krewpact_user_id: 'user_admin',
          krewpact_org_id: 'org-1',
          role_keys: ['platform_admin'],
        },
        krewpact_user_id: 'user_admin',
        krewpact_org_id: 'org-1',
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetKrewpactRoles.mockResolvedValue(['platform_admin']);

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
      sessionClaims: {
        sub: 'user_admin',
        metadata: { krewpact_user_id: 'user_admin', role_keys: ['platform_admin'] },
        krewpact_user_id: 'user_admin',
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetKrewpactRoles.mockResolvedValue(['platform_admin']);

    const res = await POST(
      makeRequest({}, { title: '', raw_content: 'content', source_type: 'upload' }),
    );
    expect(res.status).toBe(400);
  });
});
