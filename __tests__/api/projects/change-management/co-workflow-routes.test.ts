/**
 * Tests for change order workflow API routes:
 * - POST /api/projects/[id]/change-orders/[coId]/approve
 * - POST /api/projects/[id]/change-orders/[coId]/reject
 * - POST /api/projects/[id]/change-orders/[coId]/submit-to-client
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 20, reset: 0 }),
  rateLimitResponse: vi.fn(),
}));

const mockGetRoles = vi.fn();
vi.mock('@/lib/api/org', () => ({
  getKrewpactRoles: () => mockGetRoles(),
}));

import { auth } from '@clerk/nextjs/server';

import { makeJsonRequest, makeRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);

const PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const CO_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';

const mockApprove = vi.fn();
const mockReject = vi.fn();
const mockSubmitToClient = vi.fn();

vi.mock('@/lib/services/change-order-workflow', () => ({
  approveChangeOrder: (...args: unknown[]) => mockApprove(...args),
  rejectChangeOrder: (...args: unknown[]) => mockReject(...args),
  submitToClient: (...args: unknown[]) => mockSubmitToClient(...args),
}));

// ---- Approve ----

describe('POST /api/projects/[id]/change-orders/[coId]/approve', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    mockGetRoles.mockResolvedValue([]);
    const { POST } = await import(
      '@/app/api/projects/[id]/change-orders/[coId]/approve/route'
    );
    const res = await POST(makeRequest(`/api/projects/${PROJECT_ID}/change-orders/${CO_ID}/approve`), {
      params: Promise.resolve({ id: PROJECT_ID, coId: CO_ID }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 without required role', async () => {
    mockClerkAuth(mockAuth);
    mockGetRoles.mockResolvedValue(['field_supervisor']);
    const { POST } = await import(
      '@/app/api/projects/[id]/change-orders/[coId]/approve/route'
    );
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/change-orders/${CO_ID}/approve`, {}),
      { params: Promise.resolve({ id: PROJECT_ID, coId: CO_ID }) },
    );
    expect(res.status).toBe(403);
  });

  it('approves CO and returns updated record', async () => {
    mockClerkAuth(mockAuth);
    mockGetRoles.mockResolvedValue(['project_manager']);
    const updated = { id: CO_ID, status: 'approved', approved_at: '2026-03-25T10:00:00Z' };
    mockApprove.mockResolvedValueOnce({ success: true, changeOrder: updated });

    const { POST } = await import(
      '@/app/api/projects/[id]/change-orders/[coId]/approve/route'
    );
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/change-orders/${CO_ID}/approve`, {
        comment: 'Looks good',
      }),
      { params: Promise.resolve({ id: PROJECT_ID, coId: CO_ID }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('approved');
    expect(mockApprove).toHaveBeenCalledWith(CO_ID, expect.any(String), 'Looks good');
  });

  it('returns 400 when CO is in invalid state', async () => {
    mockClerkAuth(mockAuth);
    mockGetRoles.mockResolvedValue(['operations_manager']);
    mockApprove.mockResolvedValueOnce({
      success: false,
      error: 'Cannot approve CO in status: draft',
      code: 'INVALID_STATE',
    });

    const { POST } = await import(
      '@/app/api/projects/[id]/change-orders/[coId]/approve/route'
    );
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/change-orders/${CO_ID}/approve`, {}),
      { params: Promise.resolve({ id: PROJECT_ID, coId: CO_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when CO not found', async () => {
    mockClerkAuth(mockAuth);
    mockGetRoles.mockResolvedValue(['executive']);
    mockApprove.mockResolvedValueOnce({ success: false, error: 'Change order not found', code: 'NOT_FOUND' });

    const { POST } = await import(
      '@/app/api/projects/[id]/change-orders/[coId]/approve/route'
    );
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/change-orders/${CO_ID}/approve`, {}),
      { params: Promise.resolve({ id: PROJECT_ID, coId: CO_ID }) },
    );
    expect(res.status).toBe(404);
  });
});

// ---- Reject ----

describe('POST /api/projects/[id]/change-orders/[coId]/reject', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    mockGetRoles.mockResolvedValue([]);
    const { POST } = await import(
      '@/app/api/projects/[id]/change-orders/[coId]/reject/route'
    );
    const res = await POST(makeRequest(`/api/projects/${PROJECT_ID}/change-orders/${CO_ID}/reject`), {
      params: Promise.resolve({ id: PROJECT_ID, coId: CO_ID }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 when reason is missing', async () => {
    mockClerkAuth(mockAuth);
    mockGetRoles.mockResolvedValue(['project_manager']);
    const { POST } = await import(
      '@/app/api/projects/[id]/change-orders/[coId]/reject/route'
    );
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/change-orders/${CO_ID}/reject`, {}),
      { params: Promise.resolve({ id: PROJECT_ID, coId: CO_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it('rejects CO with reason', async () => {
    mockClerkAuth(mockAuth);
    mockGetRoles.mockResolvedValue(['project_manager']);
    const updated = { id: CO_ID, status: 'rejected', reason: 'Out of scope' };
    mockReject.mockResolvedValueOnce({ success: true, changeOrder: updated });

    const { POST } = await import(
      '@/app/api/projects/[id]/change-orders/[coId]/reject/route'
    );
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/change-orders/${CO_ID}/reject`, {
        reason: 'Out of scope',
      }),
      { params: Promise.resolve({ id: PROJECT_ID, coId: CO_ID }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('rejected');
    expect(mockReject).toHaveBeenCalledWith(CO_ID, expect.any(String), 'Out of scope');
  });

  it('returns 403 without required role', async () => {
    mockClerkAuth(mockAuth);
    mockGetRoles.mockResolvedValue(['estimator']);
    const { POST } = await import(
      '@/app/api/projects/[id]/change-orders/[coId]/reject/route'
    );
    const res = await POST(
      makeJsonRequest(`/api/projects/${PROJECT_ID}/change-orders/${CO_ID}/reject`, {
        reason: 'No budget',
      }),
      { params: Promise.resolve({ id: PROJECT_ID, coId: CO_ID }) },
    );
    expect(res.status).toBe(403);
  });
});

// ---- Submit to Client ----

describe('POST /api/projects/[id]/change-orders/[coId]/submit-to-client', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    mockGetRoles.mockResolvedValue([]);
    const { POST } = await import(
      '@/app/api/projects/[id]/change-orders/[coId]/submit-to-client/route'
    );
    const res = await POST(
      makeRequest(`/api/projects/${PROJECT_ID}/change-orders/${CO_ID}/submit-to-client`),
      { params: Promise.resolve({ id: PROJECT_ID, coId: CO_ID }) },
    );
    expect(res.status).toBe(401);
  });

  it('transitions CO to client_review', async () => {
    mockClerkAuth(mockAuth);
    mockGetRoles.mockResolvedValue(['operations_manager']);
    const updated = { id: CO_ID, status: 'client_review' };
    mockSubmitToClient.mockResolvedValueOnce({ success: true, changeOrder: updated });

    const { POST } = await import(
      '@/app/api/projects/[id]/change-orders/[coId]/submit-to-client/route'
    );
    const res = await POST(
      makeRequest(`/api/projects/${PROJECT_ID}/change-orders/${CO_ID}/submit-to-client`),
      { params: Promise.resolve({ id: PROJECT_ID, coId: CO_ID }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('client_review');
    expect(mockSubmitToClient).toHaveBeenCalledWith(CO_ID);
  });

  it('returns 403 without required role', async () => {
    mockClerkAuth(mockAuth);
    mockGetRoles.mockResolvedValue(['field_supervisor']);
    const { POST } = await import(
      '@/app/api/projects/[id]/change-orders/[coId]/submit-to-client/route'
    );
    const res = await POST(
      makeRequest(`/api/projects/${PROJECT_ID}/change-orders/${CO_ID}/submit-to-client`),
      { params: Promise.resolve({ id: PROJECT_ID, coId: CO_ID }) },
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 when CO is not in submitted state', async () => {
    mockClerkAuth(mockAuth);
    mockGetRoles.mockResolvedValue(['project_manager']);
    mockSubmitToClient.mockResolvedValueOnce({
      success: false,
      error: 'CO must be in submitted state to send to client',
      code: 'INVALID_STATE',
    });

    const { POST } = await import(
      '@/app/api/projects/[id]/change-orders/[coId]/submit-to-client/route'
    );
    const res = await POST(
      makeRequest(`/api/projects/${PROJECT_ID}/change-orders/${CO_ID}/submit-to-client`),
      { params: Promise.resolve({ id: PROJECT_ID, coId: CO_ID }) },
    );
    expect(res.status).toBe(400);
  });
});
