import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStat = vi.hoisted(() => vi.fn());
const mockReadFile = vi.hoisted(() => vi.fn());

vi.mock('@/lib/env', () => ({
  env: { DEFAULT_ORG_ID: 'test-org-00000000-0000-0000-0000-000000000000' },
}));
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }));
vi.mock('@/lib/api/org', () => ({
  getKrewpactRoles: vi.fn(),
  getKrewpactOrgId: vi.fn().mockResolvedValue('test-org-00000000-0000-0000-0000-000000000000'),
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
vi.mock('fs/promises', () => ({
  default: { readFile: mockReadFile, stat: mockStat },
  readFile: mockReadFile,
  stat: mockStat,
}));

import { auth } from '@clerk/nextjs/server';

import { POST } from '@/app/api/executive/staging/bulk-import/route';
import { getKrewpactRoles } from '@/lib/api/org';
import { createServiceClient } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockGetKrewpactRoles = vi.mocked(getKrewpactRoles);

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
      sub: 'user_admin',
      metadata: {
        krewpact_user_id: 'user_admin',
        krewpact_org_id: orgId,
        role_keys: ['platform_admin'],
      },
      krewpact_user_id: 'user_admin',
      krewpact_org_id: orgId,
    },
  } as unknown as Awaited<ReturnType<typeof auth>>);
  mockGetKrewpactRoles.mockResolvedValue(['platform_admin']);
}

describe('POST /api/executive/staging/bulk-import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 for executive (non-admin) role', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: {
        sub: 'user_exec',
        metadata: { krewpact_user_id: 'user_exec', role_keys: ['executive'] },
        krewpact_user_id: 'user_exec',
      },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetKrewpactRoles.mockResolvedValue(['executive']);

    const res = await POST(makeRequest({ files: [{ path: '/some/file.md' }] }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.message).toContain('Insufficient permissions');
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
    const eqOrgFn = vi.fn().mockReturnValue({ data: [], error: null });
    const eqChecksumFn = vi.fn().mockReturnValue({ eq: eqOrgFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqChecksumFn });
    const insertFn = vi.fn().mockReturnValue({ error: null });

    mockCreateServiceClient.mockReturnValue({
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
    const eqOrgFn = vi.fn().mockReturnValue({
      data: [{ id: 'existing-doc' }],
      error: null,
    });
    const eqChecksumFn = vi.fn().mockReturnValue({ eq: eqOrgFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqChecksumFn });

    mockCreateServiceClient.mockReturnValue({
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

    mockCreateServiceClient.mockReturnValue({
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
