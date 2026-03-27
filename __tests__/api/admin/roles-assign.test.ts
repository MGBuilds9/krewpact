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
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'uuid-123', clerk_user_id: 'user_target' }, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/rbac/sync-roles', () => ({
  syncRolesToBothStores: vi.fn().mockResolvedValue({ success: true, errors: [] }),
}));

import { auth } from '@clerk/nextjs/server';

import { makeJsonRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { POST } from '@/app/api/admin/roles/assign/route';
import { getKrewpactRoles } from '@/lib/api/org';
import { syncRolesToBothStores } from '@/lib/rbac/sync-roles';

const mockAuth = vi.mocked(auth);
const mockRoles = vi.mocked(getKrewpactRoles);
const mockSync = vi.mocked(syncRolesToBothStores);

describe('POST /api/admin/roles/assign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSync.mockResolvedValue({ success: true, errors: [] });
  });

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/admin/roles/assign', { user_id: 'user_abc', role_keys: [] }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when user lacks platform_admin role', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    mockRoles.mockResolvedValue(['operations_manager']);

    const res = await POST(
      makeJsonRequest('/api/admin/roles/assign', { user_id: 'user_abc', role_keys: [] }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 for missing user_id', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);

    const res = await POST(
      makeJsonRequest('/api/admin/roles/assign', { role_keys: ['estimator'] }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
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

  it('assigns roles via syncRolesToBothStores and returns success', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);

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

    expect(mockSync).toHaveBeenCalledWith({
      supabaseUserId: 'uuid-123',
      clerkUserId: 'user_target',
      roleKeys: ['project_manager', 'estimator'],
      divisionIds: undefined,
      assignedBy: 'user_admin',
    });
  });

  it('allows empty role_keys to clear all roles', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);

    const res = await POST(
      makeJsonRequest('/api/admin/roles/assign', { user_id: 'user_target', role_keys: [] }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role_keys).toEqual([]);
  });

  it('passes division_ids to sync when provided', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);

    const divisionId = '550e8400-e29b-41d4-a716-446655440000';
    const res = await POST(
      makeJsonRequest('/api/admin/roles/assign', {
        user_id: 'user_target',
        role_keys: ['accounting'],
        division_ids: [divisionId],
      }),
    );
    expect(res.status).toBe(200);

    expect(mockSync).toHaveBeenCalledWith(
      expect.objectContaining({
        divisionIds: [divisionId],
      }),
    );
  });

  it('returns 500 when sync fails completely', async () => {
    mockClerkAuth(mockAuth, 'user_admin');
    mockRoles.mockResolvedValue(['platform_admin']);
    mockSync.mockRejectedValueOnce(new Error('Sync unavailable'));

    const res = await POST(
      makeJsonRequest('/api/admin/roles/assign', {
        user_id: 'user_target',
        role_keys: ['executive'],
      }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
