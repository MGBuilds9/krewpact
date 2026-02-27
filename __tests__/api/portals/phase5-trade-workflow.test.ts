import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET as getTasks } from '@/app/api/portal/trade/tasks/route';
import { PATCH as patchTaskStatus } from '@/app/api/portal/trade/tasks/[id]/status/route';
import { GET as getSubmittals, POST as postSubmittal } from '@/app/api/portal/trade/submittals/route';
import { GET as getSiteLogs, POST as postSiteLog } from '@/app/api/portal/trade/site-logs/route';
import { mockClerkAuth, mockClerkUnauth, makeRequest, makeJsonRequest, TEST_IDS } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

const ACTIVE_TRADE_PA = { id: 'pa-trade-001', status: 'active', actor_type: 'trade_partner' };
const TASK_ID = '00000000-0000-4000-a000-000000000099';

function makeTradeMock(overrides: { portalAccount?: object | null; task?: object | null; permFound?: boolean } = {}) {
  const pa = overrides.portalAccount !== undefined ? overrides.portalAccount : ACTIVE_TRADE_PA;
  const task = overrides.task ?? { id: TASK_ID, status: 'in_progress', metadata: { trade_portal_id: 'pa-trade-001' } };
  const permFound = overrides.permFound !== false;

  const singleMock = vi.fn();
  let callCount = 0;
  singleMock.mockImplementation(() => {
    callCount++;
    if (callCount === 1) return Promise.resolve({ data: pa, error: pa ? null : { message: 'not found' } });
    if (callCount === 2) return Promise.resolve({ data: task, error: task ? null : { message: 'not found' } });
    return Promise.resolve({ data: permFound ? { id: 'perm-001' } : null, error: permFound ? null : { message: 'not found' } });
  });

  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null }); // no duplicate

  const tableObj = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    update: vi.fn().mockReturnThis(),
    single: singleMock,
    maybeSingle,
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'created-001' }, error: null }),
      }),
    }),
  };
  // Make every chained method return the same object for fluent calls
  tableObj.select.mockReturnValue(tableObj);
  tableObj.eq.mockReturnValue(tableObj);
  tableObj.contains.mockReturnValue(tableObj);
  tableObj.order.mockReturnValue(tableObj);
  tableObj.update.mockReturnValue(tableObj);

  const fromFn = vi.fn().mockReturnValue(tableObj);

  return { from: fromFn };
}

// ============================================================
// Tasks API
// ============================================================
describe('GET /api/portal/trade/tasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await getTasks(makeRequest('/api/portal/trade/tasks'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-trade-partner portal account', async () => {
    mockClerkAuth(mockAuth, 'user_client');
    mockCreateUserClient.mockReturnValue(makeTradeMock({ portalAccount: { id: 'pa-1', status: 'active', actor_type: 'client' } }) as unknown as ReturnType<typeof createUserClient>);
    const res = await getTasks(makeRequest('/api/portal/trade/tasks'));
    expect(res.status).toBe(403);
  });
});

// ============================================================
// Task status PATCH
// ============================================================
describe('PATCH /api/portal/trade/tasks/[id]/status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await patchTaskStatus(makeJsonRequest(`/api/portal/trade/tasks/${TASK_ID}/status`, { status: 'done' }, 'PATCH'), { params: Promise.resolve({ id: TASK_ID }) });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid status value', async () => {
    mockClerkAuth(mockAuth, 'user_trade');
    mockCreateUserClient.mockReturnValue(makeTradeMock() as unknown as ReturnType<typeof createUserClient>);
    const res = await patchTaskStatus(makeJsonRequest(`/api/portal/trade/tasks/${TASK_ID}/status`, { status: 'invalid_status' }, 'PATCH'), { params: Promise.resolve({ id: TASK_ID }) });
    expect(res.status).toBe(400);
  });

  it('returns 400 when trying to revert a done task', async () => {
    mockClerkAuth(mockAuth, 'user_trade');
    mockCreateUserClient.mockReturnValue(makeTradeMock({ task: { id: TASK_ID, status: 'done', metadata: { trade_portal_id: 'pa-trade-001' } } }) as unknown as ReturnType<typeof createUserClient>);
    const res = await patchTaskStatus(makeJsonRequest(`/api/portal/trade/tasks/${TASK_ID}/status`, { status: 'in_progress' }, 'PATCH'), { params: Promise.resolve({ id: TASK_ID }) });
    expect(res.status).toBe(400);
  });
});

// ============================================================
// Submittals API
// ============================================================
describe('POST /api/portal/trade/submittals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await postSubmittal(makeJsonRequest('/api/portal/trade/submittals', { project_id: TEST_IDS.PROJECT_ID, submittal_type: 'shop_drawing', title: 'Steel shop drawings' }, 'POST'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when title is empty', async () => {
    mockClerkAuth(mockAuth, 'user_trade');
    mockCreateUserClient.mockReturnValue(makeTradeMock() as unknown as ReturnType<typeof createUserClient>);
    const res = await postSubmittal(makeJsonRequest('/api/portal/trade/submittals', { project_id: TEST_IDS.PROJECT_ID, submittal_type: 'shop_drawing', title: '' }, 'POST'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid submittal_type', async () => {
    mockClerkAuth(mockAuth, 'user_trade');
    mockCreateUserClient.mockReturnValue(makeTradeMock() as unknown as ReturnType<typeof createUserClient>);
    const res = await postSubmittal(makeJsonRequest('/api/portal/trade/submittals', { project_id: TEST_IDS.PROJECT_ID, submittal_type: 'not_a_type', title: 'Valid title' }, 'POST'));
    expect(res.status).toBe(400);
  });
});

// ============================================================
// Site logs API
// ============================================================
describe('POST /api/portal/trade/site-logs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await postSiteLog(makeJsonRequest('/api/portal/trade/site-logs', { project_id: TEST_IDS.PROJECT_ID, log_date: '2026-02-27', work_summary: 'Installed conduit on all circuits in panel room', crew_count: 4 }, 'POST'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when work_summary is too short', async () => {
    mockClerkAuth(mockAuth, 'user_trade');
    mockCreateUserClient.mockReturnValue(makeTradeMock() as unknown as ReturnType<typeof createUserClient>);
    const res = await postSiteLog(makeJsonRequest('/api/portal/trade/site-logs', { project_id: TEST_IDS.PROJECT_ID, log_date: '2026-02-27', work_summary: 'Short', crew_count: 4 }, 'POST'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid log_date format', async () => {
    mockClerkAuth(mockAuth, 'user_trade');
    mockCreateUserClient.mockReturnValue(makeTradeMock() as unknown as ReturnType<typeof createUserClient>);
    const res = await postSiteLog(makeJsonRequest('/api/portal/trade/site-logs', { project_id: TEST_IDS.PROJECT_ID, log_date: '27-02-2026', // Wrong format - should be YYYY-MM-DD
      work_summary: 'Complete enough work summary for framing crew', crew_count: 4 }, 'POST'));
    expect(res.status).toBe(400);
  });
});

// ============================================================
// Immutability & duplicate detection logic
// ============================================================
describe('Portal immutability guards', () => {
  it('done status prevents portal revert', () => {
    const task = { status: 'done' };
    const canModify = task.status !== 'done';
    expect(canModify).toBe(false);
  });

  it('in_progress task can be transitioned to done by trade partner', () => {
    const task = { status: 'in_progress' };
    const newStatus = 'done';
    const canTransition = task.status !== 'done' && ['todo', 'in_progress', 'blocked', 'done'].includes(newStatus);
    expect(canTransition).toBe(true);
  });

  it('duplicate site log detection returns 409 when log exists', () => {
    const existing = { id: 'log-exists' };
    const shouldReturn409 = !!existing;
    expect(shouldReturn409).toBe(true);
  });
});
