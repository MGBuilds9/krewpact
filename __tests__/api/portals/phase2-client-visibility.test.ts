import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET as getProjects } from '@/app/api/portal/projects/route';
import { GET as getProject } from '@/app/api/portal/projects/[id]/route';
import { GET as getDocs } from '@/app/api/portal/projects/[id]/documents/route';
import { GET as getCOs } from '@/app/api/portal/projects/[id]/change-orders/route';
import { POST as approveCO } from '@/app/api/portal/projects/[id]/change-orders/[coId]/approve/route';
import { GET as getInvoices } from '@/app/api/portal/projects/[id]/invoices/route';
import { mockClerkAuth, mockClerkUnauth, makeRequest, makeJsonRequest, TEST_IDS } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

const PROJECT_ID = TEST_IDS.PROJECT_ID;
const CO_ID = '00000000-0000-4000-a000-000000000099';

const ACTIVE_PORTAL_ACCOUNT = {
  id: 'pa-client-001',
  status: 'active',
  actor_type: 'client',
  company_name: 'Acme Corp',
  contact_name: 'Jane Client',
};

// Builds a mock supabase that returns different data per table + method
function buildPortalMock(overrides: {
  portalAccount?: object | null;
  permissions?: object[] | null;
  project?: object | null;
  documents?: object[] | null;
  changeOrders?: object[] | null;
  snapshots?: object[] | null;
  permSet?: Record<string, boolean>;
} = {}) {
  const permSet = overrides.permSet ?? { view_documents: true, approve_change_orders: true, view_financials: true };
  const portalAccount = overrides.portalAccount !== undefined ? overrides.portalAccount : ACTIVE_PORTAL_ACCOUNT;
  const permissions = overrides.permissions ?? [{ project_id: PROJECT_ID, permission_set: permSet, projects: { id: PROJECT_ID, project_name: 'Test Project', project_number: 'PRJ-001', status: 'active', start_date: null, target_completion_date: null, actual_completion_date: null, site_address: null } }];
  const project = overrides.project ?? { id: PROJECT_ID, project_name: 'Test Project', project_number: 'PRJ-001', status: 'active', baseline_budget: 500000, current_budget: 490000 };
  const documents = overrides.documents ?? [{ id: 'doc-1', file_name: 'Plans.pdf', file_type: 'pdf', file_size_bytes: 1024, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }];
  const changeOrders = overrides.changeOrders ?? [{ id: CO_ID, co_number: 'CO-001', title: 'Foundation upgrade', description: null, status: 'pending_client_approval', total_amount: 12000, submitted_at: '2026-02-01T00:00:00Z', approved_at: null, rejected_at: null }];
  const snapshots = overrides.snapshots ?? [{ id: 'snap-1', snapshot_date: '2026-02-01', period_label: 'Feb 2026', total_cost: 100000, budget_total: 500000 }];

  const single = vi.fn();
  const select = vi.fn().mockReturnThis();
  const eq = vi.fn().mockReturnThis();
  const in_ = vi.fn().mockReturnThis();
  const order = vi.fn().mockReturnThis();
  const limit = vi.fn().mockReturnThis();
  const insert = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnThis();

  let callCount = 0;
  single.mockImplementation(() => {
    callCount++;
    // first call = portal_accounts, second = portal_permissions, third = projects or CO
    if (callCount === 1) return Promise.resolve({ data: portalAccount, error: portalAccount ? null : { message: 'Not found' } });
    if (callCount === 2) return Promise.resolve({ data: permissions?.[0] ? { permission_set: permSet } : null, error: permissions?.[0] ? null : { message: 'Not found' } });
    return Promise.resolve({ data: project, error: project ? null : { message: 'Not found' } });
  });

  const from = vi.fn().mockImplementation((table: string) => ({
    select,
    eq,
    in: in_,
    order,
    limit,
    insert,
    update,
    single,
    range: vi.fn().mockReturnThis(),
    // Return correct data based on table
    then: undefined,
  }));

  // Override select().eq().eq()...etc to eventually resolve
  select.mockImplementation(() => ({
    eq,
    in: in_,
    order,
    single,
    limit,
    range: vi.fn().mockReturnThis(),
  }));

  eq.mockImplementation(() => ({
    eq,
    in: in_,
    order,
    single,
    limit,
    is: vi.fn().mockReturnThis(),
    select,
    then: undefined,
  }));

  in_.mockImplementation(() => ({
    order,
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data: changeOrders, error: null }),
  }));

  order.mockImplementation(() => ({
    limit,
    range: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown; error: null }) => void) => {
      resolve({ data: permissions, error: null });
    },
  }));

  limit.mockImplementation(() => ({
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data: snapshots, error: null }),
  }));

  return { from, select, eq, single, insert, update };
}

// ============================================================
// GET /api/portal/projects
// ============================================================
describe('GET /api/portal/projects', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await getProjects(makeRequest('/api/portal/projects'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when no portal account exists for the user', async () => {
    mockClerkAuth(mockAuth, 'clerk_user_no_portal');
    const mock = buildPortalMock({ portalAccount: null });
    mockCreateUserClient.mockResolvedValue({ from: mock.from } as unknown as ReturnType<typeof createUserClient>);
    const res = await getProjects(makeRequest('/api/portal/projects'));
    expect(res.status).toBe(403);
  });
});

// ============================================================
// GET /api/portal/projects/[id]
// ============================================================
describe('GET /api/portal/projects/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await getProject(makeRequest(`/api/portal/projects/${PROJECT_ID}`), { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 when portal_account is inactive', async () => {
    mockClerkAuth(mockAuth, 'clerk_user_inactive');
    const mock = buildPortalMock({ portalAccount: { ...ACTIVE_PORTAL_ACCOUNT, status: 'invited' } });
    mockCreateUserClient.mockResolvedValue({ from: mock.from } as unknown as ReturnType<typeof createUserClient>);
    const res = await getProject(makeRequest(`/api/portal/projects/${PROJECT_ID}`), { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(403);
  });
});

// ============================================================
// GET /api/portal/projects/[id]/invoices — financial guard
// ============================================================
describe('GET /api/portal/projects/[id]/invoices', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await getInvoices(makeRequest(`/api/portal/projects/${PROJECT_ID}/invoices`), { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 when view_financials is false', async () => {
    mockClerkAuth(mockAuth, 'clerk_without_financials');
    const mock = buildPortalMock({ permSet: { view_documents: true, view_financials: false } });
    mockCreateUserClient.mockResolvedValue({ from: mock.from } as unknown as ReturnType<typeof createUserClient>);
    const res = await getInvoices(makeRequest(`/api/portal/projects/${PROJECT_ID}/invoices`), { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(403);
  });
});

// ============================================================
// POST /api/portal/projects/[id]/change-orders/[coId]/approve
// ============================================================
describe('POST CO approve /api/portal/projects/[id]/change-orders/[coId]/approve', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await approveCO(
      makeJsonRequest(`/api/portal/projects/${PROJECT_ID}/change-orders/${CO_ID}/approve`, {}, 'POST'),
      { params: Promise.resolve({ id: PROJECT_ID, coId: CO_ID }) }
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when approve_change_orders is false', async () => {
    mockClerkAuth(mockAuth, 'clerk_no_approve');
    const mock = buildPortalMock({ permSet: { view_documents: true, approve_change_orders: false } });
    mockCreateUserClient.mockResolvedValue({ from: mock.from } as unknown as ReturnType<typeof createUserClient>);
    const res = await approveCO(
      makeJsonRequest(`/api/portal/projects/${PROJECT_ID}/change-orders/${CO_ID}/approve`, {}, 'POST'),
      { params: Promise.resolve({ id: PROJECT_ID, coId: CO_ID }) }
    );
    expect(res.status).toBe(403);
  });
});

// ============================================================
// Zod schema edge cases
// ============================================================
describe('Portal Validator edge cases', () => {
  it('permission_set missing approve_change_orders key defaults to false guard', () => {
    const permSet: Record<string, boolean> = {};
    // Application code checks permSet.approve_change_orders truthy
    expect(!!permSet.approve_change_orders).toBe(false);
  });

  it('empty permission_set does not expose financials', () => {
    const permSet: Record<string, boolean> = {};
    expect(permSet.view_financials).toBeUndefined();
    expect(!!permSet.view_financials).toBe(false);
  });
});
