/**
 * Tests for change-order-workflow service layer.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn().mockResolvedValue({
    client: { from: (...args: unknown[]) => mockFrom(...args) },
    error: null,
  }),
  createScopedServiceClient: vi.fn().mockReturnValue({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const CO_ID = 'co-test-123';
const PROJECT_ID = 'proj-test-456';
const USER_ID = 'user-test-789';

function buildChain(returnValue: unknown) {
  const chain: Record<string, unknown> = {};
  const fns = ['select', 'eq', 'insert', 'update', 'upsert', 'order', 'in'];
  fns.forEach((fn) => {
    chain[fn] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue(returnValue);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  return chain;
}

describe('submitForApproval', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when CO not found', async () => {
    const chain = buildChain({ data: null, error: { message: 'not found', code: 'PGRST116' } });
    mockFrom.mockReturnValue(chain);

    const { submitForApproval } = await import('@/lib/services/change-order-workflow');
    const result = await submitForApproval(CO_ID, USER_ID);
    expect(result.success).toBe(false);
    expect(result.code).toBe('NOT_FOUND');
  });

  it('returns error when CO is not in draft state', async () => {
    const chain = buildChain({
      data: { id: CO_ID, project_id: PROJECT_ID, status: 'submitted' },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const { submitForApproval } = await import('@/lib/services/change-order-workflow');
    const result = await submitForApproval(CO_ID, USER_ID);
    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_STATE');
  });

  it('transitions draft CO to submitted', async () => {
    const fetchChain = buildChain({ data: { id: CO_ID, project_id: PROJECT_ID, status: 'draft' }, error: null });
    const updateChain = buildChain({ data: { id: CO_ID, status: 'submitted' }, error: null });
    const auditChain = buildChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(auditChain);

    const { submitForApproval } = await import('@/lib/services/change-order-workflow');
    const result = await submitForApproval(CO_ID, USER_ID);
    expect(result.success).toBe(true);
    expect((result.changeOrder as Record<string, unknown>)?.status).toBe('submitted');
  });
});

describe('approveChangeOrder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error for wrong state', async () => {
    const chain = buildChain({ data: { id: CO_ID, project_id: PROJECT_ID, status: 'draft' }, error: null });
    mockFrom.mockReturnValue(chain);

    const { approveChangeOrder } = await import('@/lib/services/change-order-workflow');
    const result = await approveChangeOrder(CO_ID, USER_ID);
    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_STATE');
  });

  it('approves a submitted CO', async () => {
    const fetchChain = buildChain({
      data: { id: CO_ID, project_id: PROJECT_ID, status: 'submitted', amount_delta: 5000 },
      error: null,
    });
    const updateChain = buildChain({ data: { id: CO_ID, status: 'approved' }, error: null });
    const auditChain = buildChain({ data: null, error: null });
    // recalculateContractValue calls: project fetch, approved COs fetch, project update
    const projectChain = buildChain({ data: { id: PROJECT_ID, baseline_budget: 100000 }, error: null });
    const cosChain = { ...buildChain(null), then: (r: (v: unknown) => void) => r({ data: [{ amount_delta: 5000 }], error: null }) };
    const recalcChain = buildChain({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(auditChain)
      .mockReturnValueOnce(projectChain)
      .mockReturnValueOnce(cosChain)
      .mockReturnValueOnce(recalcChain);

    const { approveChangeOrder } = await import('@/lib/services/change-order-workflow');
    const result = await approveChangeOrder(CO_ID, USER_ID, 'LGTM');
    expect(result.success).toBe(true);
  });
});

describe('rejectChangeOrder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a submitted CO with reason', async () => {
    const fetchChain = buildChain({ data: { id: CO_ID, project_id: PROJECT_ID, status: 'submitted' }, error: null });
    const updateChain = buildChain({ data: { id: CO_ID, status: 'rejected', reason: 'Too costly' }, error: null });
    const auditChain = buildChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(auditChain);

    const { rejectChangeOrder } = await import('@/lib/services/change-order-workflow');
    const result = await rejectChangeOrder(CO_ID, USER_ID, 'Too costly');
    expect(result.success).toBe(true);
    expect((result.changeOrder as Record<string, unknown>)?.status).toBe('rejected');
  });

  it('returns error for draft CO', async () => {
    const chain = buildChain({ data: { id: CO_ID, project_id: PROJECT_ID, status: 'draft' }, error: null });
    mockFrom.mockReturnValue(chain);

    const { rejectChangeOrder } = await import('@/lib/services/change-order-workflow');
    const result = await rejectChangeOrder(CO_ID, USER_ID, 'reason');
    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_STATE');
  });
});

describe('submitToClient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('transitions submitted CO to client_review', async () => {
    const fetchChain = buildChain({ data: { id: CO_ID, project_id: PROJECT_ID, status: 'submitted' }, error: null });
    const updateChain = buildChain({ data: { id: CO_ID, status: 'client_review' }, error: null });
    const auditChain = buildChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(auditChain);

    const { submitToClient } = await import('@/lib/services/change-order-workflow');
    const result = await submitToClient(CO_ID);
    expect(result.success).toBe(true);
    expect((result.changeOrder as Record<string, unknown>)?.status).toBe('client_review');
  });

  it('returns error when CO is not submitted', async () => {
    const chain = buildChain({ data: { id: CO_ID, project_id: PROJECT_ID, status: 'draft' }, error: null });
    mockFrom.mockReturnValue(chain);

    const { submitToClient } = await import('@/lib/services/change-order-workflow');
    const result = await submitToClient(CO_ID);
    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_STATE');
  });
});

describe('recalculateContractValue', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sums approved CO deltas and updates project contract_value', async () => {
    const projectChain = buildChain({ data: { id: PROJECT_ID, baseline_budget: 200000 }, error: null });
    const cosChain = {
      ...buildChain(null),
      then: (r: (v: unknown) => void) =>
        r({ data: [{ amount_delta: 10000 }, { amount_delta: 5000 }], error: null }),
    };
    const updateChain = buildChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(projectChain)
      .mockReturnValueOnce(cosChain)
      .mockReturnValueOnce(updateChain);

    const { recalculateContractValue } = await import('@/lib/services/change-order-workflow');
    await recalculateContractValue(PROJECT_ID);

    expect(mockFrom).toHaveBeenCalledWith('projects');
    expect(mockFrom).toHaveBeenCalledWith('change_orders');
  });
});
