/**
 * RBAC tests for POST /api/timesheet-batches/[batchId]/approve
 *
 * Verifies: 401 unauthenticated, 403 wrong role, 200 authorized roles.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetKrewpactRoles = vi.fn();
vi.mock('@/lib/api/org', () => ({
  requireRole: vi.fn(),
  getKrewpactRoles: () => mockGetKrewpactRoles(),
}));
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn().mockResolvedValue({
    client: { from: (...args: unknown[]) => mockFrom(...args) },
    error: null,
  }),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/request-context', () => ({
  requestContext: { run: (_: unknown, fn: () => unknown) => fn() },
  generateRequestId: () => 'req_test',
}));
vi.mock('@/lib/logger', () => {
  const m = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() };
  m.child.mockReturnValue(m);
  return { logger: m };
});

import { auth } from '@clerk/nextjs/server';

import { makeJsonRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { POST } from '@/app/api/timesheet-batches/[batchId]/approve/route';

const mockAuth = vi.mocked(auth);

const BATCH_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

function makeContext(batchId: string) {
  return { params: Promise.resolve({ batchId }) };
}

function makeApproveRequest() {
  return makeJsonRequest(`/api/timesheet-batches/${BATCH_ID}/approve`, { status: 'approved' });
}

function singleChain(data: unknown) {
  const chain: Record<string, unknown> = {};
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data, error: null });
  return chain;
}

describe('POST /api/timesheet-batches/[batchId]/approve — RBAC', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(makeApproveRequest(), makeContext(BATCH_ID));
    expect(res.status).toBe(401);
  });

  it('returns 403 for project_coordinator role', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['project_coordinator']);
    const res = await POST(makeApproveRequest(), makeContext(BATCH_ID));
    expect(res.status).toBe(403);
  });

  it('returns 403 for estimator role', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['estimator']);
    const res = await POST(makeApproveRequest(), makeContext(BATCH_ID));
    expect(res.status).toBe(403);
  });

  it('allows access for payroll_admin role', async () => {
    mockClerkAuth(mockAuth, 'user_payroll');
    mockGetKrewpactRoles.mockResolvedValue(['payroll_admin']);
    const updatedBatch = { id: BATCH_ID, status: 'approved', approved_by: 'user_payroll' };
    mockFrom.mockReturnValue(singleChain(updatedBatch));

    const res = await POST(makeApproveRequest(), makeContext(BATCH_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('approved');
  });

  it('allows access for operations_manager role', async () => {
    mockClerkAuth(mockAuth, 'user_ops');
    mockGetKrewpactRoles.mockResolvedValue(['operations_manager']);
    const updatedBatch = { id: BATCH_ID, status: 'approved', approved_by: 'user_ops' };
    mockFrom.mockReturnValue(singleChain(updatedBatch));

    const res = await POST(makeApproveRequest(), makeContext(BATCH_ID));
    expect(res.status).toBe(200);
  });

  it('allows access for accounting role', async () => {
    mockClerkAuth(mockAuth, 'user_acc');
    mockGetKrewpactRoles.mockResolvedValue(['accounting']);
    const updatedBatch = { id: BATCH_ID, status: 'approved', approved_by: 'user_acc' };
    mockFrom.mockReturnValue(singleChain(updatedBatch));

    const res = await POST(makeApproveRequest(), makeContext(BATCH_ID));
    expect(res.status).toBe(200);
  });
});
