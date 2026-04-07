import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import { getKrewpactDivisions, getKrewpactRoles, getKrewpactUserId } from '@/lib/api/org';

const mockAuth = vi.mocked(auth);

describe('metadata claim helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads user id, roles, and divisions from metadata claims', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      sessionClaims: {
        metadata: {
          krewpact_user_id: 'kp-user-123',
          role_keys: ['platform_admin', 'executive'],
          division_ids: ['contracting', 'homes'],
        },
      },
    } as never);

    await expect(getKrewpactUserId()).resolves.toBe('kp-user-123');
    await expect(getKrewpactRoles()).resolves.toEqual(['platform_admin', 'executive']);
    await expect(getKrewpactDivisions()).resolves.toEqual(['contracting', 'homes']);
  });

  it('ignores legacy top-level claims when metadata is missing', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      sessionClaims: {
        krewpact_user_id: 'legacy-user',
        krewpact_org_id: 'legacy-org',
        krewpact_roles: ['platform_admin'],
        krewpact_divisions: ['legacy-division'],
      },
    } as never);

    await expect(getKrewpactUserId()).resolves.toBeNull();
    await expect(getKrewpactRoles()).resolves.toEqual([]);
    await expect(getKrewpactDivisions()).resolves.toEqual([]);
  });
});
