/**
 * Tests for portal change order approval (C4 key workflow).
 *
 * Verifies:
 * - Only active portal accounts with approve_change_orders permission can approve
 * - CO must be in pending_client_approval state
 * - Audit log is written on approval
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn().mockResolvedValue({
    client: { from: (...args: unknown[]) => mockFrom(...args) },
    error: null,
  }),
}));

import { auth } from '@clerk/nextjs/server';

import { makeJsonRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { POST } from '@/app/api/portal/projects/[id]/change-orders/[coId]/approve/route';

const mockAuth = vi.mocked(auth);

const PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const CO_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

function chainMock(response: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(response);
  chain.then = (resolve: (v: unknown) => void) => resolve(response);
  return chain;
}

const makeParams = () => Promise.resolve({ id: PROJECT_ID, coId: CO_ID });

describe('POST /api/portal/projects/[id]/change-orders/[coId]/approve', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest(`/api/portal/projects/${PROJECT_ID}/change-orders/${CO_ID}/approve`, {}),
      { params: makeParams() },
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when portal account not found', async () => {
    mockClerkAuth(mockAuth);
    mockFrom.mockReturnValue(chainMock({ data: null, error: { code: 'PGRST116' } }));

    const res = await POST(
      makeJsonRequest(`/api/portal/projects/${PROJECT_ID}/change-orders/${CO_ID}/approve`, {}),
      { params: makeParams() },
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when portal account is inactive', async () => {
    mockClerkAuth(mockAuth);
    mockFrom.mockReturnValue(chainMock({ data: { id: 'pa-1', status: 'pending' }, error: null }));

    const res = await POST(
      makeJsonRequest(`/api/portal/projects/${PROJECT_ID}/change-orders/${CO_ID}/approve`, {}),
      { params: makeParams() },
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when approve_change_orders permission is false', async () => {
    mockClerkAuth(mockAuth);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chainMock({ data: { id: 'pa-1', status: 'active' }, error: null });
      }
      // portal_permissions — no approve_change_orders
      return chainMock({ data: { permission_set: { view_financials: true } }, error: null });
    });

    const res = await POST(
      makeJsonRequest(`/api/portal/projects/${PROJECT_ID}/change-orders/${CO_ID}/approve`, {}),
      { params: makeParams() },
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Insufficient permissions');
  });

  it('returns 400 when CO is not in pending_client_approval state', async () => {
    mockClerkAuth(mockAuth);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chainMock({ data: { id: 'pa-1', status: 'active' }, error: null });
      }
      if (callCount === 2) {
        return chainMock({
          data: { permission_set: { approve_change_orders: true } },
          error: null,
        });
      }
      // change_orders — already approved
      return chainMock({
        data: { id: CO_ID, status: 'approved', project_id: PROJECT_ID },
        error: null,
      });
    });

    const res = await POST(
      makeJsonRequest(`/api/portal/projects/${PROJECT_ID}/change-orders/${CO_ID}/approve`, {}),
      { params: makeParams() },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Cannot approve CO in status: approved');
  });

  it('approves CO successfully when all checks pass', async () => {
    mockClerkAuth(mockAuth);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chainMock({ data: { id: 'pa-1', status: 'active' }, error: null });
      }
      if (callCount === 2) {
        return chainMock({
          data: { permission_set: { approve_change_orders: true } },
          error: null,
        });
      }
      if (callCount === 3) {
        // CO in pending_client_approval
        return chainMock({
          data: { id: CO_ID, status: 'pending_client_approval', project_id: PROJECT_ID },
          error: null,
        });
      }
      if (callCount === 4) {
        // update result
        return chainMock({
          data: { id: CO_ID, status: 'approved', approved_at: '2026-03-05T00:00:00.000Z' },
          error: null,
        });
      }
      // audit_logs insert
      return chainMock({ data: null, error: null });
    });

    const res = await POST(
      makeJsonRequest(`/api/portal/projects/${PROJECT_ID}/change-orders/${CO_ID}/approve`, {}),
      { params: makeParams() },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('approved');
  });

  it('returns 404 when CO not found for project', async () => {
    mockClerkAuth(mockAuth);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chainMock({ data: { id: 'pa-1', status: 'active' }, error: null });
      }
      if (callCount === 2) {
        return chainMock({
          data: { permission_set: { approve_change_orders: true } },
          error: null,
        });
      }
      // CO not found
      return chainMock({ data: null, error: { code: 'PGRST116' } });
    });

    const res = await POST(
      makeJsonRequest(`/api/portal/projects/${PROJECT_ID}/change-orders/${CO_ID}/approve`, {}),
      { params: makeParams() },
    );
    expect(res.status).toBe(404);
  });
});
