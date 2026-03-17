import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/org', () => ({ getOrgIdFromAuth: vi.fn(), getKrewpactRoles: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { auth } from '@clerk/nextjs/server';

import { DELETE, GET as GET_DETAIL, PATCH } from '@/app/api/executive/subscriptions/[id]/route';
import { GET, POST } from '@/app/api/executive/subscriptions/route';
import { getKrewpactRoles, getOrgIdFromAuth } from '@/lib/api/org';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockGetOrgIdFromAuth = vi.mocked(getOrgIdFromAuth);
const mockGetKrewpactRoles = vi.mocked(getKrewpactRoles);

const PARAMS = Promise.resolve({ id: 'sub-1' });

function makeRequest(method = 'GET', searchParams: Record<string, string> = {}, body?: unknown) {
  const url = new URL('http://localhost/api/executive/subscriptions');
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  if (body) {
    return new NextRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  return new NextRequest(url, { method });
}

function makeDetailRequest(method = 'GET', body?: unknown) {
  const url = new URL('http://localhost/api/executive/subscriptions/sub-1');
  if (body) {
    return new NextRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  return new NextRequest(url, { method });
}

const VALID_SUBSCRIPTION = {
  name: 'GitHub Enterprise',
  category: 'dev_tools',
  vendor: 'GitHub',
  monthly_cost: 150,
  currency: 'CAD',
  billing_cycle: 'monthly',
};

// ─── LIST route ──────────────────────────────────────────────────────────────

describe('GET /api/executive/subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKrewpactRoles.mockResolvedValue(['executive']);
  });

  it('returns 401 without auth', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as any as Awaited<ReturnType<typeof auth>>);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 200 with subscription list', async () => {
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
    } as any as Awaited<ReturnType<typeof auth>>);

    mockGetOrgIdFromAuth.mockResolvedValue('org-1');

    const subs = [
      { id: 'sub-1', name: 'GitHub Enterprise', org_id: 'org-1' },
      { id: 'sub-2', name: 'Vercel Pro', org_id: 'org-1' },
    ];

    const orderFn = vi.fn().mockReturnValue({ data: subs, error: null });
    const eqFn = vi
      .fn()
      .mockReturnValue({ order: orderFn, eq: vi.fn().mockReturnValue({ order: orderFn }) });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

    mockCreateUserClientSafe.mockResolvedValue({
      client: {
        from: vi.fn().mockReturnValue({ select: selectFn }),
      } as any,
      error: null,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data).toHaveLength(2);
  });
});

// ─── CREATE route ─────────────────────────────────────────────────────────────

describe('POST /api/executive/subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKrewpactRoles.mockResolvedValue(['platform_admin']);
  });

  it('returns 403 for non-admin', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: {
        sub: 'user_exec',
        metadata: { krewpact_user_id: 'user_exec', role_keys: ['executive'] },
        krewpact_user_id: 'user_exec',
      },
    } as any as Awaited<ReturnType<typeof auth>>);
    mockGetKrewpactRoles.mockResolvedValue(['executive']);

    const res = await POST(makeRequest('POST', {}, VALID_SUBSCRIPTION));
    expect(res.status).toBe(403);
  });

  it('returns 201 with valid data', async () => {
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
    } as any as Awaited<ReturnType<typeof auth>>);

    mockGetOrgIdFromAuth.mockResolvedValue('org-1');

    const newSub = { id: 'sub-new', ...VALID_SUBSCRIPTION, org_id: 'org-1' };
    const singleFn = vi.fn().mockReturnValue({ data: newSub, error: null });
    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleFn });
    const insertFn = vi.fn().mockReturnValue({ select: selectAfterInsert });

    mockCreateUserClientSafe.mockResolvedValue({
      client: {
        from: vi.fn().mockReturnValue({ insert: insertFn }),
      } as any,
      error: null,
    });

    const res = await POST(makeRequest('POST', {}, VALID_SUBSCRIPTION));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe('sub-new');
  });

  it('returns 400 for invalid data (missing name)', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_admin',
      sessionClaims: {
        sub: 'user_admin',
        metadata: { krewpact_user_id: 'user_admin', role_keys: ['platform_admin'] },
        krewpact_user_id: 'user_admin',
      },
    } as any as Awaited<ReturnType<typeof auth>>);

    const res = await POST(makeRequest('POST', {}, { category: 'dev_tools', monthly_cost: 100 }));
    expect(res.status).toBe(400);
  });
});

// ─── DETAIL route ────────────────────────────────────────────────────────────

describe('GET /api/executive/subscriptions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKrewpactRoles.mockResolvedValue(['executive']);
  });

  it('returns 401 without auth', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as any as Awaited<ReturnType<typeof auth>>);

    const res = await GET_DETAIL(makeDetailRequest(), { params: PARAMS });
    expect(res.status).toBe(401);
  });

  it('returns 200 with subscription detail', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: {
        sub: 'user_exec',
        metadata: { krewpact_user_id: 'user_exec', role_keys: ['executive'] },
        krewpact_user_id: 'user_exec',
      },
    } as any as Awaited<ReturnType<typeof auth>>);

    mockGetOrgIdFromAuth.mockResolvedValue('org-1');

    const sub = { id: 'sub-1', name: 'GitHub Enterprise', org_id: 'org-1' };
    const singleFn = vi.fn().mockReturnValue({ data: sub, error: null });
    const eqOrgFn = vi.fn().mockReturnValue({ single: singleFn });
    const eqIdFn = vi.fn().mockReturnValue({ eq: eqOrgFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqIdFn });

    mockCreateUserClientSafe.mockResolvedValue({
      client: {
        from: vi.fn().mockReturnValue({ select: selectFn }),
      } as any,
      error: null,
    });

    const res = await GET_DETAIL(makeDetailRequest(), { params: PARAMS });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('sub-1');
  });
});

// ─── PATCH route ─────────────────────────────────────────────────────────────

describe('PATCH /api/executive/subscriptions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKrewpactRoles.mockResolvedValue(['platform_admin']);
  });

  it('returns 200 on update', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_admin',
      sessionClaims: {
        sub: 'user_admin',
        metadata: { krewpact_user_id: 'user_admin', role_keys: ['platform_admin'] },
        krewpact_user_id: 'user_admin',
      },
    } as any as Awaited<ReturnType<typeof auth>>);

    mockGetOrgIdFromAuth.mockResolvedValue('org-1');

    const updatedSub = { id: 'sub-1', name: 'GitHub Enterprise Updated', org_id: 'org-1' };
    const singleFn = vi.fn().mockReturnValue({ data: updatedSub, error: null });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const eqOrgFn = vi.fn().mockReturnValue({ select: selectFn });
    const eqIdFn = vi.fn().mockReturnValue({ eq: eqOrgFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqIdFn });

    mockCreateUserClientSafe.mockResolvedValue({
      client: {
        from: vi.fn().mockReturnValue({ update: updateFn }),
      } as any,
      error: null,
    });

    const res = await PATCH(makeDetailRequest('PATCH', { name: 'GitHub Enterprise Updated' }), {
      params: PARAMS,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('GitHub Enterprise Updated');
  });
});

// ─── DELETE route ─────────────────────────────────────────────────────────────

describe('DELETE /api/executive/subscriptions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKrewpactRoles.mockResolvedValue(['platform_admin']);
  });

  it('returns 204 on success', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_admin',
      sessionClaims: {
        sub: 'user_admin',
        metadata: { krewpact_user_id: 'user_admin', role_keys: ['platform_admin'] },
        krewpact_user_id: 'user_admin',
      },
    } as any as Awaited<ReturnType<typeof auth>>);

    mockGetOrgIdFromAuth.mockResolvedValue('org-1');

    const existing = { id: 'sub-1' };
    // Mock for the existence check (.select().eq().eq().single())
    const existSingleFn = vi.fn().mockReturnValue({ data: existing, error: null });
    const existEqOrgFn = vi.fn().mockReturnValue({ single: existSingleFn });
    const existEqIdFn = vi.fn().mockReturnValue({ eq: existEqOrgFn });
    const existSelectFn = vi.fn().mockReturnValue({ eq: existEqIdFn });

    // Mock for delete().eq().eq()
    const deleteEqOrgFn = vi.fn().mockReturnValue({ error: null });
    const deleteEqIdFn = vi.fn().mockReturnValue({ eq: deleteEqOrgFn });
    const deleteFn = vi.fn().mockReturnValue({ eq: deleteEqIdFn });

    mockCreateUserClientSafe.mockResolvedValue({
      client: {
        from: vi.fn().mockReturnValue({
          select: existSelectFn,
          delete: deleteFn,
        }),
      } as any,
      error: null,
    });

    const res = await DELETE(makeDetailRequest('DELETE'), { params: PARAMS });
    expect(res.status).toBe(204);
  });
});
