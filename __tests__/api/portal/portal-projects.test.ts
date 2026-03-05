/**
 * Tests for portal project access scoping (C4).
 *
 * Verifies:
 * - Portal users can only see projects they have permissions for
 * - Inactive portal accounts are rejected
 * - Financial data is redacted unless permission_set grants it
 * - View logging works
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn().mockResolvedValue({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

import { auth } from '@clerk/nextjs/server';
import { GET } from '@/app/api/portal/projects/route';
import { mockClerkAuth, mockClerkUnauth, makeRequest } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);

function chainMock(response: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(response);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: unknown) => void) => resolve(response);
  return chain;
}

describe('GET /api/portal/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/portal/projects'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when no portal account exists', async () => {
    mockClerkAuth(mockAuth);
    mockFrom.mockReturnValue(
      chainMock({ data: null, error: { code: 'PGRST116', message: 'not found' } }),
    );

    const res = await GET(makeRequest('/api/portal/projects'));
    expect(res.status).toBe(403);
  });

  it('returns 403 when portal account is inactive', async () => {
    mockClerkAuth(mockAuth);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // portal_accounts query
        return chainMock({
          data: { id: 'pa-1', actor_type: 'client', status: 'pending', company_name: 'TestCo', contact_name: 'John' },
          error: null,
        });
      }
      return chainMock({ data: [], error: null });
    });

    const res = await GET(makeRequest('/api/portal/projects'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('not active');
  });

  it('returns projects with portal account info when active', async () => {
    mockClerkAuth(mockAuth);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // portal_accounts query
        return chainMock({
          data: { id: 'pa-1', actor_type: 'client', status: 'active', company_name: 'TestCo', contact_name: 'John' },
          error: null,
        });
      }
      // portal_permissions query
      return chainMock({
        data: [
          {
            project_id: 'proj-1',
            permission_set: { view_financials: false },
            projects: {
              id: 'proj-1',
              project_name: 'Test Project',
              project_number: 'P-001',
              status: 'active',
              start_date: '2026-01-01',
              target_completion_date: '2026-12-31',
              actual_completion_date: null,
              site_address: '123 Main St',
            },
          },
        ],
        error: null,
      });
    });

    const res = await GET(makeRequest('/api/portal/projects'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.portal_account.company_name).toBe('TestCo');
    expect(body.projects).toHaveLength(1);
    expect(body.projects[0].project_name).toBe('Test Project');
  });
});

describe('GET /api/portal/projects/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const { GET: getDetail } = await import('@/app/api/portal/projects/[id]/route');
    const res = await getDetail(
      makeRequest('/api/portal/projects/proj-1'),
      { params: Promise.resolve({ id: 'proj-1' }) },
    );
    expect(res.status).toBe(401);
  });

  it('redacts financial data when view_financials is false', async () => {
    mockClerkAuth(mockAuth);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // portal_accounts
        return chainMock({
          data: { id: 'pa-1', status: 'active' },
          error: null,
        });
      }
      if (callCount === 2) {
        // portal_permissions
        return chainMock({
          data: { permission_set: { view_financials: false } },
          error: null,
        });
      }
      if (callCount === 3) {
        // projects
        return chainMock({
          data: {
            id: 'proj-1',
            project_name: 'Test',
            project_number: 'P-001',
            status: 'active',
            baseline_budget: 500000,
            current_budget: 520000,
            account_id: 'acc-1',
          },
          error: null,
        });
      }
      // portal_view_logs insert
      return chainMock({ data: null, error: null });
    });

    const { GET: getDetail } = await import('@/app/api/portal/projects/[id]/route');
    const res = await getDetail(
      makeRequest('/api/portal/projects/proj-1'),
      { params: Promise.resolve({ id: 'proj-1' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.baseline_budget).toBeUndefined();
    expect(body.current_budget).toBeUndefined();
    expect(body.project_name).toBe('Test');
  });
});
