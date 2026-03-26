/**
 * RBAC tests for POST /api/expenses/[id]/approve
 *
 * Verifies: 401 unauthenticated, 403 wrong role, 201 authorized roles.
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
  expenseApprovalSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { decision: 'approved', reviewer_notes: null },
    }),
  },
}));

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { makeJsonRequest, mockClerkAuth, mockClerkUnauth, mockSupabaseClient } from '@/__tests__/helpers';
import { POST } from '@/app/api/expenses/[id]/approve/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const EXPENSE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeApproveRequest() {
  return makeJsonRequest(`/api/expenses/${EXPENSE_ID}/approve`, {
    decision: 'approved',
    reviewer_notes: 'Looks good',
  });
}

describe('POST /api/expenses/[id]/approve — RBAC', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

    const res = await POST(makeApproveRequest(), makeContext(EXPENSE_ID));
    expect(res.status).toBe(401);
  });

  it('returns 403 for field_supervisor role', async () => {
    mockClerkAuth(mockAuth);
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));

    const res = await POST(makeApproveRequest(), makeContext(EXPENSE_ID));
    expect(res.status).toBe(403);
  });

  it('returns 403 for project_manager role', async () => {
    mockClerkAuth(mockAuth);
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));

    const res = await POST(makeApproveRequest(), makeContext(EXPENSE_ID));
    expect(res.status).toBe(403);
  });

  it('allows access for accounting role', async () => {
    mockClerkAuth(mockAuth, 'user_acc');
    mockRequireRole.mockResolvedValue({ userId: 'user_acc', roles: ['accounting'] });
    const supabase = mockSupabaseClient({
      tables: { expense_approvals: { data: { id: 'appr-1' }, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase, error: null });

    const res = await POST(makeApproveRequest(), makeContext(EXPENSE_ID));
    expect(res.status).toBe(201);
  });

  it('allows access for operations_manager role', async () => {
    mockClerkAuth(mockAuth, 'user_ops');
    mockRequireRole.mockResolvedValue({ userId: 'user_ops', roles: ['operations_manager'] });
    const supabase = mockSupabaseClient({
      tables: { expense_approvals: { data: { id: 'appr-2' }, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase, error: null });

    const res = await POST(makeApproveRequest(), makeContext(EXPENSE_ID));
    expect(res.status).toBe(201);
  });

  it('allows access for executive role', async () => {
    mockClerkAuth(mockAuth, 'user_exec');
    mockRequireRole.mockResolvedValue({ userId: 'user_exec', roles: ['executive'] });
    const supabase = mockSupabaseClient({
      tables: { expense_approvals: { data: { id: 'appr-3' }, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase, error: null });

    const res = await POST(makeApproveRequest(), makeContext(EXPENSE_ID));
    expect(res.status).toBe(201);
  });
});
