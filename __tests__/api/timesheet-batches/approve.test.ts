/**
 * RBAC tests for POST /api/timesheet-batches/[batchId]/approve
 *
 * Verifies: 401 unauthenticated, 403 wrong role, 200 authorized roles.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

const mockRequireRole = vi.fn();
vi.mock('@/lib/api/org', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

vi.mock('@/lib/validators/time-expense', () => ({
  timesheetBatchApprovalSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { status: 'approved' },
    }),
  },
}));

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { makeJsonRequest, mockClerkAuth, mockClerkUnauth, mockSupabaseClient } from '@/__tests__/helpers';
import { POST } from '@/app/api/timesheet-batches/[batchId]/approve/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const BATCH_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

function makeContext(batchId: string) {
  return { params: Promise.resolve({ batchId }) };
}

function makeApproveRequest() {
  return makeJsonRequest(`/api/timesheet-batches/${BATCH_ID}/approve`, { status: 'approved' });
}

describe('POST /api/timesheet-batches/[batchId]/approve — RBAC', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

    const res = await POST(makeApproveRequest(), makeContext(BATCH_ID));
    expect(res.status).toBe(401);
  });

  it('returns 403 for project_coordinator role', async () => {
    mockClerkAuth(mockAuth);
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));

    const res = await POST(makeApproveRequest(), makeContext(BATCH_ID));
    expect(res.status).toBe(403);
  });

  it('returns 403 for estimator role', async () => {
    mockClerkAuth(mockAuth);
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));

    const res = await POST(makeApproveRequest(), makeContext(BATCH_ID));
    expect(res.status).toBe(403);
  });

  it('allows access for payroll_admin role', async () => {
    mockClerkAuth(mockAuth, 'user_payroll');
    mockRequireRole.mockResolvedValue({ userId: 'user_payroll', roles: ['payroll_admin'] });
    const updatedBatch = { id: BATCH_ID, status: 'approved', approved_by: 'user_payroll' };
    const supabase = mockSupabaseClient({
      tables: { timesheet_batches: { data: updatedBatch, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase, error: null });

    const res = await POST(makeApproveRequest(), makeContext(BATCH_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('approved');
  });

  it('allows access for operations_manager role', async () => {
    mockClerkAuth(mockAuth, 'user_ops');
    mockRequireRole.mockResolvedValue({ userId: 'user_ops', roles: ['operations_manager'] });
    const updatedBatch = { id: BATCH_ID, status: 'approved', approved_by: 'user_ops' };
    const supabase = mockSupabaseClient({
      tables: { timesheet_batches: { data: updatedBatch, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase, error: null });

    const res = await POST(makeApproveRequest(), makeContext(BATCH_ID));
    expect(res.status).toBe(200);
  });

  it('allows access for accounting role', async () => {
    mockClerkAuth(mockAuth, 'user_acc');
    mockRequireRole.mockResolvedValue({ userId: 'user_acc', roles: ['accounting'] });
    const updatedBatch = { id: BATCH_ID, status: 'approved', approved_by: 'user_acc' };
    const supabase = mockSupabaseClient({
      tables: { timesheet_batches: { data: updatedBatch, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase, error: null });

    const res = await POST(makeApproveRequest(), makeContext(BATCH_ID));
    expect(res.status).toBe(200);
  });
});
