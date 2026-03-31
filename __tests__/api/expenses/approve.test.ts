/**
 * RBAC tests for POST /api/expenses/[id]/approve
 *
 * Verifies: 401 unauthenticated, 403 wrong role, 201 authorized roles.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetKrewpactRoles = vi.fn();
vi.mock('@/lib/api/org', () => ({
  requireRole: vi.fn(),
  getKrewpactRoles: () => mockGetKrewpactRoles(),
  getKrewpactOrgId: vi.fn().mockResolvedValue('test-org-00000000-0000-0000-0000-000000000000'),
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
import { POST } from '@/app/api/expenses/[id]/approve/route';

const mockAuth = vi.mocked(auth);

const EXPENSE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeApproveRequest() {
  return makeJsonRequest(`/api/expenses/${EXPENSE_ID}/approve`, {
    expense_id: EXPENSE_ID,
    decision: 'approved',
    reviewer_notes: 'Looks good',
  });
}

function insertChain(data: unknown) {
  const chain: Record<string, unknown> = {};
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data, error: null });
  // allow eq() to return undefined (fire-and-forget update)
  return chain;
}

describe('POST /api/expenses/[id]/approve — RBAC', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(makeApproveRequest(), makeContext(EXPENSE_ID));
    expect(res.status).toBe(401);
  });

  it('returns 403 for field_supervisor role', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['field_supervisor']);
    const res = await POST(makeApproveRequest(), makeContext(EXPENSE_ID));
    expect(res.status).toBe(403);
  });

  it('returns 403 for project_manager role', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['project_manager']);
    const res = await POST(makeApproveRequest(), makeContext(EXPENSE_ID));
    expect(res.status).toBe(403);
  });

  it('allows access for accounting role', async () => {
    mockClerkAuth(mockAuth, 'user_acc');
    mockGetKrewpactRoles.mockResolvedValue(['accounting']);
    mockFrom.mockReturnValue(insertChain({ id: 'appr-1' }));

    const res = await POST(makeApproveRequest(), makeContext(EXPENSE_ID));
    expect(res.status).toBe(201);
  });

  it('allows access for operations_manager role', async () => {
    mockClerkAuth(mockAuth, 'user_ops');
    mockGetKrewpactRoles.mockResolvedValue(['operations_manager']);
    mockFrom.mockReturnValue(insertChain({ id: 'appr-2' }));

    const res = await POST(makeApproveRequest(), makeContext(EXPENSE_ID));
    expect(res.status).toBe(201);
  });

  it('allows access for executive role', async () => {
    mockClerkAuth(mockAuth, 'user_exec');
    mockGetKrewpactRoles.mockResolvedValue(['executive']);
    mockFrom.mockReturnValue(insertChain({ id: 'appr-3' }));

    const res = await POST(makeApproveRequest(), makeContext(EXPENSE_ID));
    expect(res.status).toBe(201);
  });
});
