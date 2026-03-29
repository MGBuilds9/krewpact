/**
 * Tests for POST /api/payroll/exports/[id]/reconcile
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/services/payroll-export', () => ({
  reconcileExport: vi.fn(),
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
import { reconcileExport } from '@/lib/services/payroll-export';
import { createServiceClient } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockReconcileExport = vi.mocked(reconcileExport);
const mockCreateServiceClient = vi.mocked(createServiceClient);

const EXPORT_ID = '00000000-0000-4000-a000-000000000050';

function makeMockSupabase(exportData: unknown, rowsData: unknown) {
  let fromCallCount = 0;
  const updateChain = {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
  return {
    from: vi.fn().mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(exportData),
            }),
          }),
        };
      }
      if (fromCallCount === 2) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() =>
              Promise.resolve(rowsData),
            ),
          }),
        };
      }
      return updateChain;
    }),
  };
}

describe('POST /api/payroll/exports/[id]/reconcile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKrewpactRoles.mockResolvedValue(['payroll_admin']);
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    mockCreateServiceClient.mockReturnValue(
      makeMockSupabase({ data: null, error: null }, { data: [], error: null }) as never,
    );
    const { POST } = await import('@/app/api/payroll/exports/[id]/reconcile/route');
    const res = await POST(
      makeJsonRequest(`/api/payroll/exports/${EXPORT_ID}/reconcile`, {
        csv_content: 'Employee ID,Hours - Regular\nemp-001,40.00',
      }),
      { params: Promise.resolve({ id: EXPORT_ID }) },
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for unauthorized role', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['estimator']);
    mockCreateServiceClient.mockReturnValue(
      makeMockSupabase({ data: null, error: null }, { data: [], error: null }) as never,
    );
    const { POST } = await import('@/app/api/payroll/exports/[id]/reconcile/route');
    const res = await POST(
      makeJsonRequest(`/api/payroll/exports/${EXPORT_ID}/reconcile`, {
        csv_content: 'Employee ID,Hours - Regular\nemp-001,40.00',
      }),
      { params: Promise.resolve({ id: EXPORT_ID }) },
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when export not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateServiceClient.mockReturnValue(
      makeMockSupabase(
        { data: null, error: { message: 'not found' } },
        { data: [], error: null },
      ) as never,
    );
    const { POST } = await import('@/app/api/payroll/exports/[id]/reconcile/route');
    const res = await POST(
      makeJsonRequest(`/api/payroll/exports/${EXPORT_ID}/reconcile`, {
        csv_content: 'Employee ID,Hours - Regular\nemp-001,40.00',
      }),
      { params: Promise.resolve({ id: EXPORT_ID }) },
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 when export is not completed', async () => {
    mockClerkAuth(mockAuth);
    mockCreateServiceClient.mockReturnValue(
      makeMockSupabase(
        { data: { id: EXPORT_ID, status: 'processing' }, error: null },
        { data: [], error: null },
      ) as never,
    );
    const { POST } = await import('@/app/api/payroll/exports/[id]/reconcile/route');
    const res = await POST(
      makeJsonRequest(`/api/payroll/exports/${EXPORT_ID}/reconcile`, {
        csv_content: 'Employee ID,Hours - Regular\nemp-001,40.00',
      }),
      { params: Promise.resolve({ id: EXPORT_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it('returns reconciliation result on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateServiceClient.mockReturnValue(
      makeMockSupabase(
        { data: { id: EXPORT_ID, status: 'completed' }, error: null },
        {
          data: [
            {
              employee_id: 'emp-001',
              hours_regular: 40,
              hours_overtime: 5,
              cost_code: 'CC-100',
              pay_rate: 35,
              department: 'contracting',
              project_id: null,
            },
          ],
          error: null,
        },
      ) as never,
    );
    mockReconcileExport.mockReturnValue({
      matched: 1,
      mismatched: 0,
      missing_in_adp: 0,
      missing_in_export: 0,
      details: [{ employee_id: 'emp-001', status: 'matched' }],
    });

    const { POST } = await import('@/app/api/payroll/exports/[id]/reconcile/route');
    const res = await POST(
      makeJsonRequest(`/api/payroll/exports/${EXPORT_ID}/reconcile`, {
        csv_content: 'Employee ID,Hours - Regular,Hours - Overtime\nemp-001,40.00,5.00',
      }),
      { params: Promise.resolve({ id: EXPORT_ID }) },
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.matched).toBe(1);
    expect(body.mismatched).toBe(0);
  });

  it('returns 400 when csv_content is empty', async () => {
    mockClerkAuth(mockAuth);
    const { POST } = await import('@/app/api/payroll/exports/[id]/reconcile/route');
    const res = await POST(
      makeJsonRequest(`/api/payroll/exports/${EXPORT_ID}/reconcile`, {
        csv_content: '',
      }),
      { params: Promise.resolve({ id: EXPORT_ID }) },
    );
    expect(res.status).toBe(400);
  });
});
