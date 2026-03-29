/**
 * Tests for GET/POST /api/payroll/exports
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/services/payroll-export', () => ({
  createPayrollExport: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
  createUserClient: vi.fn(),
  createUserClientSafe: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

const mockGetKrewpactRoles = vi.fn();
vi.mock('@/lib/api/org', () => ({
  getKrewpactRoles: (...args: unknown[]) => mockGetKrewpactRoles(...args),
  getOrgIdFromAuth: vi.fn().mockResolvedValue('org-uuid-test'),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 29 }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import { makeJsonRequest, makeRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { createPayrollExport } from '@/lib/services/payroll-export';
import { createServiceClient } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreatePayrollExport = vi.mocked(createPayrollExport);
const mockCreateServiceClient = vi.mocked(createServiceClient);

function makeMockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null, count: 0 }),
  };
  return { from: vi.fn().mockReturnValue(chain) };
}

describe('GET /api/payroll/exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKrewpactRoles.mockResolvedValue(['payroll_admin']);
    mockCreateServiceClient.mockReturnValue(makeMockSupabase() as never);
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const { GET } = await import('@/app/api/payroll/exports/route');
    const res = await GET(makeRequest('/api/payroll/exports'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for unauthorized role', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['estimator']);
    const { GET } = await import('@/app/api/payroll/exports/route');
    const res = await GET(makeRequest('/api/payroll/exports'));
    expect(res.status).toBe(403);
  });

  it('returns 200 for payroll_admin', async () => {
    mockClerkAuth(mockAuth);
    const { GET } = await import('@/app/api/payroll/exports/route');
    const res = await GET(makeRequest('/api/payroll/exports'));
    expect(res.status).toBe(200);
  });

  it('returns 200 for platform_admin', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['platform_admin']);
    const { GET } = await import('@/app/api/payroll/exports/route');
    const res = await GET(makeRequest('/api/payroll/exports'));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/payroll/exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKrewpactRoles.mockResolvedValue(['payroll_admin']);
    mockCreateServiceClient.mockReturnValue(makeMockSupabase() as never);
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const { POST } = await import('@/app/api/payroll/exports/route');
    const res = await POST(
      makeJsonRequest('/api/payroll/exports', {
        period_start: '2026-03-01',
        period_end: '2026-03-15',
        division_ids: ['00000000-0000-4000-a000-000000000010'],
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for unauthorized role', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['project_coordinator']);
    const { POST } = await import('@/app/api/payroll/exports/route');
    const res = await POST(
      makeJsonRequest('/api/payroll/exports', {
        period_start: '2026-03-01',
        period_end: '2026-03-15',
        division_ids: ['00000000-0000-4000-a000-000000000010'],
      }),
    );
    expect(res.status).toBe(403);
  });

  it('returns 201 on successful export creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreatePayrollExport.mockResolvedValue({
      exportId: 'export-uuid-1',
      csv: 'header\nrow1',
      rowCount: 5,
    });
    const { POST } = await import('@/app/api/payroll/exports/route');
    const res = await POST(
      makeJsonRequest('/api/payroll/exports', {
        period_start: '2026-03-01',
        period_end: '2026-03-15',
        division_ids: ['00000000-0000-4000-a000-000000000010'],
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('export-uuid-1');
    expect(body.row_count).toBe(5);
  });

  it('returns 400 when body validation fails', async () => {
    mockClerkAuth(mockAuth);
    const { POST } = await import('@/app/api/payroll/exports/route');
    const res = await POST(
      makeJsonRequest('/api/payroll/exports', {
        period_start: '',
        period_end: '2026-03-15',
        division_ids: [],
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 500 when service throws', async () => {
    mockClerkAuth(mockAuth);
    mockCreatePayrollExport.mockRejectedValue(new Error('Storage upload failed'));
    const { POST } = await import('@/app/api/payroll/exports/route');
    const res = await POST(
      makeJsonRequest('/api/payroll/exports', {
        period_start: '2026-03-01',
        period_end: '2026-03-15',
        division_ids: ['00000000-0000-4000-a000-000000000010'],
      }),
    );
    expect(res.status).toBe(500);
  });
});
