import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

import { getOrgFromHeaders, getOrgIdFromAuth } from '@/lib/api/org';

const mockAuth = vi.mocked(auth);

describe('getOrgIdFromAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns org_id from JWT claims when present', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      sessionClaims: { krewpact_org_id: 'org-uuid-123' },
    } as never);

    const result = await getOrgIdFromAuth();
    expect(result).toBe('org-uuid-123');
  });

  it('falls back to mdm-group when no claim present', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      sessionClaims: {},
    } as never);

    const result = await getOrgIdFromAuth();
    expect(result).toBe('mdm-group');
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
