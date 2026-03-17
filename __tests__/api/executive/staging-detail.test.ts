import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
  createServiceClient: vi.fn(),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import { DELETE, GET, PATCH } from '@/app/api/executive/staging/[id]/route';
import { createServiceClient } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateServiceClient = vi.mocked(createServiceClient);

function makeRequest(method = 'GET', body?: unknown) {
  const url = new URL('http://localhost/api/executive/staging/doc-1');
  if (body) {
    return new NextRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }
  return new NextRequest(url, { method });
}

const PARAMS = Promise.resolve({ id: 'doc-1' });

describe('GET /api/executive/staging/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when doc not found', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: {
        sub: 'user_exec',
        metadata: { krewpact_user_id: 'user_exec', role_keys: ['executive'] },
        krewpact_user_id: 'user_exec',
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const singleFn = vi.fn().mockReturnValue({ data: null, error: { code: 'PGRST116' } });
    const eqFn = vi.fn().mockReturnValue({ single: singleFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ select: selectFn }),
    } as unknown as Awaited<ReturnType<typeof createServiceClient>>);

    const res = await GET(makeRequest('GET'), { params: PARAMS });
    expect(res.status).toBe(404);
  });

  it('returns 200 with document detail', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: {
        sub: 'user_exec',
        metadata: { krewpact_user_id: 'user_exec', role_keys: ['executive'] },
        krewpact_user_id: 'user_exec',
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const doc = { id: 'doc-1', title: 'Test SOP', status: 'pending_review' };
    const singleFn = vi.fn().mockReturnValue({ data: doc, error: null });
    const eqFn = vi.fn().mockReturnValue({ single: singleFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ select: selectFn }),
    } as unknown as Awaited<ReturnType<typeof createServiceClient>>);

    const res = await GET(makeRequest('GET'), { params: PARAMS });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('doc-1');
  });
});

describe('PATCH /api/executive/staging/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 for non-admin', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: {
        sub: 'user_exec',
        metadata: { krewpact_user_id: 'user_exec', role_keys: ['executive'] },
        krewpact_user_id: 'user_exec',
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const res = await PATCH(makeRequest('PATCH', { status: 'approved' }), { params: PARAMS });
    expect(res.status).toBe(403);
  });

  it('returns 200 when updating status to approved (should set reviewed_at)', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_admin',
      sessionClaims: {
        sub: 'user_admin',
        metadata: {
          krewpact_user_id: 'kp-user-1',
          role_keys: ['platform_admin'],
        },
        krewpact_user_id: 'kp-user-1',
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const updatedDoc = {
      id: 'doc-1',
      status: 'approved',
      reviewed_by: 'kp-user-1',
      reviewed_at: new Date().toISOString(),
    };

    const singleFn = vi.fn().mockReturnValue({ data: updatedDoc, error: null });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    const eqFn = vi.fn().mockReturnValue({ select: selectFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ update: updateFn }),
    } as unknown as Awaited<ReturnType<typeof createServiceClient>>);

    const res = await PATCH(makeRequest('PATCH', { status: 'approved' }), { params: PARAMS });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('approved');
    expect(body.reviewed_at).toBeDefined();
  });

  it('returns 400 on invalid input', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_admin',
      sessionClaims: {
        sub: 'user_admin',
        metadata: { krewpact_user_id: 'user_admin', role_keys: ['platform_admin'] },
        krewpact_user_id: 'user_admin',
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const res = await PATCH(makeRequest('PATCH', { status: 'invalid_status_value' }), {
      params: PARAMS,
    });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/executive/staging/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 for non-admin', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: {
        sub: 'user_exec',
        metadata: { krewpact_user_id: 'user_exec', role_keys: ['executive'] },
        krewpact_user_id: 'user_exec',
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const res = await DELETE(makeRequest('DELETE'), { params: PARAMS });
    expect(res.status).toBe(403);
  });

  it('returns 200 on successful delete', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_admin',
      sessionClaims: {
        sub: 'user_admin',
        metadata: { krewpact_user_id: 'user_admin', role_keys: ['platform_admin'] },
        krewpact_user_id: 'user_admin',
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const eqFn = vi.fn().mockReturnValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ delete: deleteFn }),
    } as unknown as Awaited<ReturnType<typeof createServiceClient>>);

    const res = await DELETE(makeRequest('DELETE'), { params: PARAMS });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
