import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock('@/lib/api/org', () => ({
  getKrewpactRoles: vi.fn(),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { auth, clerkClient } from '@clerk/nextjs/server';

import { makeJsonRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { POST } from '@/app/api/admin/roles/assign/route';
import { getKrewpactRoles } from '@/lib/api/org';

const mockAuth = vi.mocked(auth);
const mockClerkClientFn = vi.mocked(clerkClient);
const mockRoles = vi.mocked(getKrewpactRoles);

function mockClerkSDK(overrides?: {
  getUser?: ReturnType<typeof vi.fn>;
  updateUserMetadata?: ReturnType<typeof vi.fn>;
}) {
  mockClerkClientFn.mockResolvedValue({
    users: {
      getUser: overrides?.getUser ?? vi.fn().mockResolvedValue({ publicMetadata: {} }),
      updateUserMetadata:
        overrides?.updateUserMetadata ?? vi.fn().mockResolvedValue({ publicMetadata: {} }),
    },
  } as never);
}

describe('POST /api/admin/roles/assign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/admin/roles/assign', { user_id: 'user_abc', role_keys: [] }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks platform_admin role', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    mockRoles.mockResolvedValue(['operations_manager']);

    const res = await POST(
      makeJsonRequest('/api/admin/roles/assign', { user_id: 'user_abc', role_keys: [] }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 400 for missing user_id', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);

    const res = await POST(
      makeJsonRequest('/api/admin/roles/assign', { role_keys: ['estimator'] }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('returns 400 for invalid role_key', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);

    const res = await POST(
      makeJsonRequest('/api/admin/roles/assign', {
        user_id: 'user_abc',
        role_keys: ['super_admin'],
      }),
    );
    expect(res.status).toBe(400);
  });

  it('assigns roles and returns updated user', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);
    mockClerkSDK();

    const res = await POST(
      makeJsonRequest('/api/admin/roles/assign', {
        user_id: 'user_target',
        role_keys: ['project_manager', 'estimator'],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user_id).toBe('user_target');
    expect(body.role_keys).toEqual(['project_manager', 'estimator']);
  });

  it('allows empty role_keys to clear all roles', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);
    mockClerkSDK();

    const res = await POST(
      makeJsonRequest('/api/admin/roles/assign', { user_id: 'user_target', role_keys: [] }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role_keys).toEqual([]);
  });

  it('preserves existing publicMetadata fields when updating roles', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);

    const updateUserMetadata = vi.fn().mockResolvedValue({});
    mockClerkSDK({
      getUser: vi.fn().mockResolvedValue({
        publicMetadata: { krewpact_user_id: 'uuid-123', krewpact_org_id: 'org-1' },
      }),
      updateUserMetadata,
    });

    await POST(
      makeJsonRequest('/api/admin/roles/assign', {
        user_id: 'user_target',
        role_keys: ['accounting'],
      }),
    );

    expect(updateUserMetadata).toHaveBeenCalledWith('user_target', {
      publicMetadata: {
        krewpact_user_id: 'uuid-123',
        krewpact_org_id: 'org-1',
        role_keys: ['accounting'],
      },
    });
  });

  it('returns 500 when Clerk API throws', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);
    mockClerkClientFn.mockRejectedValueOnce(new Error('Clerk unavailable'));

    const res = await POST(
      makeJsonRequest('/api/admin/roles/assign', {
        user_id: 'user_target',
        role_keys: ['executive'],
      }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Clerk unavailable');
  });
});
