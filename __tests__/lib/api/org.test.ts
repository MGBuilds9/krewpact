import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

import {
  getKrewpactDivisions,
  getKrewpactRoles,
  getKrewpactUserId,
  getOrgFromHeaders,
  getOrgIdFromAuth,
} from '@/lib/api/org';

const mockAuth = vi.mocked(auth);

describe('getOrgIdFromAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns org_id from JWT claims when present', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      sessionClaims: {
        metadata: {
          krewpact_org_id: 'org-uuid-123',
        },
      },
    } as never);

    const result = await getOrgIdFromAuth();
    expect(result).toBe('org-uuid-123');
  });

  it('falls back to default org UUID when no claim present', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      sessionClaims: { metadata: {} },
    } as never);

    const result = await getOrgIdFromAuth();
    // Falls back to DEFAULT_ORG_ID env or hardcoded org UUID (single-org mode)
    expect(result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

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
    await expect(getOrgIdFromAuth()).resolves.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe('getOrgFromHeaders', () => {
  it('extracts org context from request headers', () => {
    const req = new NextRequest('http://localhost:3000/test', {
      headers: {
        'x-krewpact-org-id': 'org-123',
        'x-krewpact-org-slug': 'mdm-group',
      },
    });

    const result = getOrgFromHeaders(req);
    expect(result).toEqual({ orgId: 'org-123', orgSlug: 'mdm-group' });
  });

  it('throws when headers are missing', () => {
    const req = new NextRequest('http://localhost:3000/test');
    expect(() => getOrgFromHeaders(req)).toThrow('Organization context required');
  });

  it('throws when only org_id is present', () => {
    const req = new NextRequest('http://localhost:3000/test', {
      headers: { 'x-krewpact-org-id': 'org-123' },
    });
    expect(() => getOrgFromHeaders(req)).toThrow('Organization context required');
  });
});
