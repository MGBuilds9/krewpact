/**
 * Tests for trade portal routes (C4).
 *
 * Verifies:
 * - Trade partner tasks are scoped by portal_account metadata
 * - Only trade_partner actor_type can access trade routes
 * - Trade portal compliance and bid submission routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn().mockResolvedValue({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

import { auth } from '@clerk/nextjs/server';
import { GET as getTradeTasks } from '@/app/api/portal/trade/tasks/route';
import { mockClerkAuth, mockClerkUnauth, makeRequest } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);

function chainMock(response: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.contains = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(response);
  chain.then = (resolve: (v: unknown) => void) => resolve(response);
  return chain;
}

describe('GET /api/portal/trade/tasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await getTradeTasks(makeRequest('/api/portal/trade/tasks'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when portal account is not trade_partner', async () => {
    mockClerkAuth(mockAuth);
    mockFrom.mockReturnValue(
      chainMock({ data: { id: 'pa-1', status: 'active', actor_type: 'client' }, error: null }),
    );

    const res = await getTradeTasks(makeRequest('/api/portal/trade/tasks'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Trade partner access only');
  });

  it('returns 403 when trade partner is inactive', async () => {
    mockClerkAuth(mockAuth);
    mockFrom.mockReturnValue(
      chainMock({ data: { id: 'pa-1', status: 'pending', actor_type: 'trade_partner' }, error: null }),
    );

    const res = await getTradeTasks(makeRequest('/api/portal/trade/tasks'));
    expect(res.status).toBe(403);
  });

  it('returns tasks scoped to trade partner account', async () => {
    mockClerkAuth(mockAuth);
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // portal_accounts
        return chainMock({
          data: { id: 'pa-trade-1', status: 'active', actor_type: 'trade_partner' },
          error: null,
        });
      }
      // tasks query
      return chainMock({
        data: [
          {
            id: 'task-1',
            project_id: 'proj-1',
            title: 'Install HVAC',
            status: 'todo',
            priority: 'high',
            due_at: '2026-04-01',
            metadata: { trade_portal_id: 'pa-trade-1' },
          },
        ],
        error: null,
      });
    });

    const res = await getTradeTasks(makeRequest('/api/portal/trade/tasks'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].title).toBe('Install HVAC');
  });

  it('filters tasks by project_id when provided', async () => {
    mockClerkAuth(mockAuth);
    const projectId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return chainMock({
          data: { id: 'pa-trade-1', status: 'active', actor_type: 'trade_partner' },
          error: null,
        });
      }
      return chainMock({ data: [], error: null });
    });

    const res = await getTradeTasks(
      makeRequest(`/api/portal/trade/tasks?project_id=${projectId}`),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks).toEqual([]);
  });
});

// ---- Trade task status update ----

describe('PATCH /api/portal/trade/tasks/[id]/status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const { PATCH } = await import('@/app/api/portal/trade/tasks/[id]/status/route');
    const req = new Request('http://localhost/api/portal/trade/tasks/task-1/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    const res = await PATCH(
      req as never,
      { params: Promise.resolve({ id: 'task-1' }) },
    );
    expect(res.status).toBe(401);
  });
});

// ---- Trade compliance ----

describe('GET /api/portal/trade/compliance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const { GET } = await import('@/app/api/portal/trade/compliance/route');
    const res = await GET(makeRequest('/api/portal/trade/compliance'));
    expect(res.status).toBe(401);
  });
});

// ---- Trade bids ----

describe('GET /api/portal/trade/bids', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const { GET } = await import('@/app/api/portal/trade/bids/route');
    const res = await GET(makeRequest('/api/portal/trade/bids'));
    expect(res.status).toBe(401);
  });
});
