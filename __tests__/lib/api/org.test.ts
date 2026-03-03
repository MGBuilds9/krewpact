import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getOrgIdFromAuth, getOrgFromHeaders } from '@/lib/api/org';
import { NextRequest } from 'next/server';

const mockAuth = vi.mocked(auth);
const mockCreateServiceClient = vi.mocked(createServiceClient);

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

  it('falls back to default org when no claim present', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      sessionClaims: {},
    } as never);

    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'default-org-id' }, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as never);

    const result = await getOrgIdFromAuth();
    expect(result).toBe('default-org-id');
    expect(mockFrom).toHaveBeenCalledWith('organizations');
  });

  it('throws when no claim and no default org', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      sessionClaims: {},
    } as never);

    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as never);

    await expect(getOrgIdFromAuth()).rejects.toThrow('No default organization found');
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
