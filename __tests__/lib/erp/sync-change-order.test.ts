/**
 * Tests for sync-change-order ERP sync handler.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('ERPNEXT_BASE_URL', 'mock');

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createScopedServiceClient: vi.fn().mockReturnValue({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/erp/sync-service', () => ({
  isMockMode: vi.fn().mockReturnValue(true),
}));

const CO_ID = 'co-sync-test-111';
const PROJECT_ID = 'proj-sync-test-222';

function jobChain(id = 'job-1') {
  const c: Record<string, unknown> = {};
  const fns = ['update', 'insert', 'upsert', 'eq'];
  fns.forEach((fn) => { c[fn] = vi.fn().mockReturnValue(c); });
  c.select = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockResolvedValue({ data: { id, attempt_count: 1, max_attempts: 3 }, error: null });
  c.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  return c;
}

function coChain(co: Record<string, unknown> | null) {
  const c: Record<string, unknown> = {};
  const fns = ['select', 'eq'];
  fns.forEach((fn) => { c[fn] = vi.fn().mockReturnValue(c); });
  c.single = vi.fn().mockResolvedValue({ data: co, error: co ? null : { message: 'not found' } });
  return c;
}

describe('syncChangeOrder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fails when change order not found', async () => {
    const j = jobChain();
    const co = coChain(null);
    // insert (createSyncJob), then select CO, then insert error, then insert event, then update job
    mockFrom
      .mockReturnValueOnce(j)   // createSyncJob insert
      .mockReturnValueOnce(co)  // CO fetch
      .mockReturnValueOnce(j)   // erp_sync_errors insert
      .mockReturnValueOnce(j)   // erp_sync_events insert
      .mockReturnValueOnce(j);  // erp_sync_jobs update

    const { syncChangeOrder } = await import('@/lib/erp/sync-handlers/sync-change-order');
    const result = await syncChangeOrder(CO_ID, 'user-1');
    expect(result.status).toBe('failed');
    expect(result.entity_type).toBe('change_order');
  });

  it('fails when CO is not approved', async () => {
    const j = jobChain();
    const co = coChain({ id: CO_ID, project_id: PROJECT_ID, co_number: 'CO-001', status: 'submitted', amount_delta: 5000 });
    mockFrom
      .mockReturnValueOnce(j)
      .mockReturnValueOnce(co)
      .mockReturnValueOnce(j)
      .mockReturnValueOnce(j)
      .mockReturnValueOnce(j);

    const { syncChangeOrder } = await import('@/lib/erp/sync-handlers/sync-change-order');
    const result = await syncChangeOrder(CO_ID, 'user-1');
    expect(result.status).toBe('failed');
    expect(result.error).toContain('approved');
  });

  it('succeeds in mock mode for approved CO', async () => {
    const j = jobChain();
    const co = coChain({
      id: CO_ID,
      project_id: PROJECT_ID,
      co_number: 'CO-001',
      status: 'approved',
      amount_delta: 8000,
      days_delta: 3,
      reason: 'Extra work',
      approved_at: '2026-03-25T10:00:00Z',
    });
    // createSyncJob, CO fetch, erp_sync_map lookup, upsert sync map, log event, update job status
    mockFrom
      .mockReturnValueOnce(j)   // createSyncJob
      .mockReturnValueOnce(co)  // CO select
      .mockReturnValueOnce(j)   // sync_map maybeSingle
      .mockReturnValueOnce(j)   // upsert sync_map
      .mockReturnValueOnce(j)   // log event
      .mockReturnValueOnce(j);  // updateJobStatus

    const { syncChangeOrder } = await import('@/lib/erp/sync-handlers/sync-change-order');
    const result = await syncChangeOrder(CO_ID, 'user-1');
    expect(result.status).toBe('succeeded');
    expect(result.entity_id).toBe(CO_ID);
    expect(result.erp_docname).toBe('SO-AMEND-CO-001');
  });

  it('includes CO number in mock erp_docname', async () => {
    const j = jobChain();
    const co = coChain({
      id: CO_ID,
      project_id: PROJECT_ID,
      co_number: 'CO-042',
      status: 'approved',
      amount_delta: 1000,
      days_delta: 0,
      reason: null,
      approved_at: '2026-03-25T10:00:00Z',
    });
    mockFrom
      .mockReturnValueOnce(j)
      .mockReturnValueOnce(co)
      .mockReturnValueOnce(j)
      .mockReturnValueOnce(j)
      .mockReturnValueOnce(j)
      .mockReturnValueOnce(j);

    const { syncChangeOrder } = await import('@/lib/erp/sync-handlers/sync-change-order');
    const result = await syncChangeOrder(CO_ID, 'user-1');
    expect(result.erp_docname).toBe('SO-AMEND-CO-042');
  });
});
