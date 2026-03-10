import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockStat = vi.hoisted(() => vi.fn());
const mockReadFile = vi.hoisted(() => vi.fn());

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('fs/promises', () => ({
  default: { readFile: mockReadFile, stat: mockStat },
  readFile: mockReadFile,
  stat: mockStat,
}));

import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/executive/staging/bulk-import/route';

const mockAuth = vi.mocked(auth);
const mockCreateServiceClient = vi.mocked(createServiceClient);

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/executive/staging/bulk-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockAdminAuth(orgId = 'org-1') {
  mockAuth.mockResolvedValue({
    userId: 'user_admin',
    sessionClaims: {
      krewpact_roles: ['platform_admin'],
      krewpact_org_id: orgId,
    },
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

describe('POST /api/executive/staging/bulk-import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 for executive (non-admin) role', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: { krewpact_roles: ['executive'] },
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const res = await POST(makeRequest({ files: [{ path: '/some/file.md' }] }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('returns 400 for invalid body (empty files array)', async () => {
    mockAdminAuth();

    const res = await POST(makeRequest({ files: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing files field', async () => {
    mockAdminAuth();

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('imports valid files and returns results', async () => {
    mockAdminAuth();

    mockStat.mockResolvedValue({ isFile: () => true });
    mockReadFile.mockResolvedValue('---\ntitle: Test\n---\n# Test Doc\n\nContent here');

    // Mock supabase: no existing checksum (dedup check returns empty), insert succeeds
    const eqChecksumFn = vi.fn().mockReturnValue({ data: [], error: null });
    const eqOrgFn = vi.fn().mockReturnValue({ eq: eqChecksumFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqOrgFn });
    const insertFn = vi.fn().mockReturnValue({ error: null });

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ select: selectFn, insert: insertFn }),
    } as unknown as Awaited<ReturnType<typeof createServiceClient>>);

    const res = await POST(makeRequest({ files: [{ path: '/vault/test.md', category: 'sop' }] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBe(1);
    expect(body.skipped).toBe(0);
    expect(body.errors).toBe(0);
    expect(body.details).toHaveLength(1);
    expect(body.details[0].status).toBe('imported');
  });

  it('skips files with existing checksum (deduplication)', async () => {
    mockAdminAuth();

    mockStat.mockResolvedValue({ isFile: () => true });
    mockReadFile.mockResolvedValue('# Duplicate Doc\n\nSame content as before');

    // Mock supabase: existing doc found with same checksum
    const eqChecksumFn = vi.fn().mockReturnValue({
      data: [{ id: 'existing-doc' }],
      error: null,
    });
    const eqOrgFn = vi.fn().mockReturnValue({ eq: eqChecksumFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqOrgFn });

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ select: selectFn }),
    } as unknown as Awaited<ReturnType<typeof createServiceClient>>);

    const res = await POST(makeRequest({ files: [{ path: '/vault/dup.md' }] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBe(0);
    expect(body.skipped).toBe(1);
    expect(body.details[0].status).toBe('skipped');
    expect(body.details[0].reason).toContain('duplicate');
  });

  it('reports errors for non-existent files', async () => {
    mockAdminAuth();

    mockStat.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createServiceClient>>);

    const res = await POST(makeRequest({ files: [{ path: '/nonexistent/file.md' }] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imported).toBe(0);
    expect(body.errors).toBe(1);
    expect(body.details[0].status).toBe('error');
  });
});
