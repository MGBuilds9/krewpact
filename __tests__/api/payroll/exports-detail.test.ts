/**
 * Tests for GET /api/payroll/exports/[id]
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
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

import { makeRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { createServiceClient } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateServiceClient = vi.mocked(createServiceClient);

const EXPORT_ID = '00000000-0000-4000-a000-000000000050';

const SAMPLE_EXPORT = {
  id: EXPORT_ID,
  batch_id: null,
  division_id: '00000000-0000-4000-a000-000000000010',
  format: 'adp_csv',
  status: 'completed',
  file_url: 'https://storage.example.com/export.csv',
  row_count: 3,
  error_log: null,
  period_start: '2026-03-01',
  period_end: '2026-03-15',
  created_by: 'user_test_123',
  created_at: '2026-03-16T00:00:00Z',
  updated_at: '2026-03-16T00:00:00Z',
};

const SAMPLE_ROWS = [
  {
    id: 'row-1',
    employee_id: 'emp-001',
    employee_name: 'Worker A',
    hours_regular: 40,
    hours_overtime: 5,
    cost_code: 'CC-100',
    pay_rate: 35,
    department: 'contracting',
    project_id: null,
    status: 'pending',
    error_message: null,
  },
];

function makeMockSupabase(exportData: unknown, rowsData: unknown) {
  let callCount = 0;
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve(exportData)),
    then: (resolve: (v: unknown) => void) => {
      callCount++;
      // First then is for export record (single), second for rows
      if (callCount <= 1) return resolve(exportData);
      return resolve(rowsData);
    },
  };
  return { from: vi.fn().mockReturnValue(chain) };
}

describe('GET /api/payroll/exports/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKrewpactRoles.mockResolvedValue(['payroll_admin']);
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    mockCreateServiceClient.mockReturnValue(
      makeMockSupabase({ data: null, error: null }, { data: [], error: null }) as never,
    );
    const { GET } = await import('@/app/api/payroll/exports/[id]/route');
    const res = await GET(makeRequest(`/api/payroll/exports/${EXPORT_ID}`), {
      params: Promise.resolve({ id: EXPORT_ID }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for unauthorized role', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['field_supervisor']);
    mockCreateServiceClient.mockReturnValue(
      makeMockSupabase({ data: null, error: null }, { data: [], error: null }) as never,
    );
    const { GET } = await import('@/app/api/payroll/exports/[id]/route');
    const res = await GET(makeRequest(`/api/payroll/exports/${EXPORT_ID}`), {
      params: Promise.resolve({ id: EXPORT_ID }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 when export not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateServiceClient.mockReturnValue(
      makeMockSupabase({ data: null, error: { message: 'not found' } }, { data: [], error: null }) as never,
    );
    const { GET } = await import('@/app/api/payroll/exports/[id]/route');
    const res = await GET(makeRequest(`/api/payroll/exports/${EXPORT_ID}`), {
      params: Promise.resolve({ id: EXPORT_ID }),
    });
    expect(res.status).toBe(404);
  });

  it('returns export detail with rows for payroll_admin', async () => {
    mockClerkAuth(mockAuth);

    // More precise mock: first call returns export, second returns rows
    let fromCallCount = 0;
    const mock = {
      from: vi.fn().mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // payroll_exports query
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: SAMPLE_EXPORT, error: null }),
              }),
            }),
          };
        }
        // payroll_export_rows query
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockImplementation(() =>
                Promise.resolve({ data: SAMPLE_ROWS, error: null }),
              ),
            }),
          }),
        };
      }),
    };

    mockCreateServiceClient.mockReturnValue(mock as never);

    const { GET } = await import('@/app/api/payroll/exports/[id]/route');
    const res = await GET(makeRequest(`/api/payroll/exports/${EXPORT_ID}`), {
      params: Promise.resolve({ id: EXPORT_ID }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.id).toBe(EXPORT_ID);
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].employee_id).toBe('emp-001');
  });
});
