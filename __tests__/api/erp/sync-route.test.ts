import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuth, mockGetRoles, mockCreateScopedServiceClient, mockEnqueue, mockIsMockMode } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockGetRoles: vi.fn(),
    mockCreateScopedServiceClient: vi.fn(),
    mockEnqueue: vi.fn(),
    mockIsMockMode: vi.fn(),
  }));

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
}));

vi.mock('@/lib/api/org', () => ({
  getKrewpactRoles: mockGetRoles,
}));

vi.mock('@/lib/supabase/server', () => ({
  createScopedServiceClient: mockCreateScopedServiceClient,
}));

vi.mock('@/lib/queue/client', () => ({
  queue: {
    enqueue: mockEnqueue,
  },
}));

vi.mock('@/lib/queue/types', () => ({
  JobType: {
    ERPSyncAccount: 'erp-sync-account',
    ERPSyncContact: 'erp-sync-contact',
    ERPSyncEstimate: 'erp-sync-estimate',
    ERPSyncOpportunity: 'erp-sync-opportunity',
    ERPSyncSalesOrder: 'erp-sync-sales-order',
    ERPSyncProject: 'erp-sync-project',
    ERPSyncTask: 'erp-sync-task',
    ERPSyncSupplier: 'erp-sync-supplier',
    ERPSyncExpense: 'erp-sync-expense',
    ERPSyncTimesheet: 'erp-sync-timesheet',
  },
}));

vi.mock('@/lib/erp/client', () => ({
  ErpClient: class MockErpClient {
    isMockMode = mockIsMockMode;
  },
}));

import { makeJsonRequest } from '@/__tests__/helpers';
import { POST } from '@/app/api/erp/sync/route';

const VALID_ENTITY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_JOB_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

function makeSyncRouteClient(options?: {
  existingJob?: { id: string; status: string } | null;
  insertedJob?: { id: string; max_attempts: number };
}) {
  const existingJob = options?.existingJob ?? null;
  const insertedJob = options?.insertedJob ?? { id: VALID_JOB_ID, max_attempts: 3 };

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== 'erp_sync_jobs') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: existingJob,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: insertedJob, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
    }),
  };
}

describe('POST /api/erp/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_123' });
    mockGetRoles.mockResolvedValue(['operations_manager']);
    mockIsMockMode.mockReturnValue(false);
    mockEnqueue.mockResolvedValue({ id: 'queue-job-1' });
    mockCreateScopedServiceClient.mockReturnValue(makeSyncRouteClient());
  });

  it('returns 401 without auth', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const res = await POST(
      makeJsonRequest('/api/erp/sync', { entity_type: 'account', entity_id: VALID_ENTITY_ID }),
    );

    expect(res.status).toBe(401);
  });

  it('returns 403 when caller lacks sync role', async () => {
    mockGetRoles.mockResolvedValue(['project_manager']);

    const res = await POST(
      makeJsonRequest('/api/erp/sync', { entity_type: 'account', entity_id: VALID_ENTITY_ID }),
    );

    expect(res.status).toBe(403);
  });

  it('returns 202 with queued job descriptor for account sync', async () => {
    const res = await POST(
      makeJsonRequest('/api/erp/sync', { entity_type: 'account', entity_id: VALID_ENTITY_ID }),
    );

    expect(res.status).toBe(202);
    await expect(res.json()).resolves.toEqual({
      job_id: VALID_JOB_ID,
      status: 'queued',
      entity_type: 'account',
      entity_id: VALID_ENTITY_ID,
      poll_url: `/api/erp/sync/${VALID_JOB_ID}`,
    });
    expect(mockEnqueue).toHaveBeenCalledWith(
      'erp-sync-account',
      expect.objectContaining({
        entityId: VALID_ENTITY_ID,
        userId: 'user_123',
        meta: expect.objectContaining({
          syncJobId: VALID_JOB_ID,
          requestedEntityType: 'account',
        }),
      }),
      3,
    );
  });

  it('queues contract sync as a sales-order job', async () => {
    const res = await POST(
      makeJsonRequest('/api/erp/sync', { entity_type: 'contract', entity_id: VALID_ENTITY_ID }),
    );

    expect(res.status).toBe(202);
    expect(mockEnqueue).toHaveBeenCalledWith(
      'erp-sync-sales-order',
      expect.objectContaining({
        meta: expect.objectContaining({
          requestedEntityType: 'contract',
          wonDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      }),
      3,
    );
  });

  it('returns 503 when production queue config is missing', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousQStashToken = process.env.QSTASH_TOKEN;
    // @ts-expect-error test env override
    process.env.NODE_ENV = 'production';
    delete process.env.QSTASH_TOKEN;

    const res = await POST(
      makeJsonRequest('/api/erp/sync', { entity_type: 'account', entity_id: VALID_ENTITY_ID }),
    );

    expect(res.status).toBe(503);

    // @ts-expect-error test env override
    process.env.NODE_ENV = previousNodeEnv;
    process.env.QSTASH_TOKEN = previousQStashToken;
  });

  it('returns 503 when ERP mock mode is active in production', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousQStashToken = process.env.QSTASH_TOKEN;
    // @ts-expect-error test env override
    process.env.NODE_ENV = 'production';
    process.env.QSTASH_TOKEN = 'qstash-token';
    mockIsMockMode.mockReturnValue(true);

    const res = await POST(
      makeJsonRequest('/api/erp/sync', { entity_type: 'account', entity_id: VALID_ENTITY_ID }),
    );

    expect(res.status).toBe(503);

    // @ts-expect-error test env override
    process.env.NODE_ENV = previousNodeEnv;
    process.env.QSTASH_TOKEN = previousQStashToken;
  });

  it('returns the existing in-flight job for duplicate sync requests', async () => {
    mockCreateScopedServiceClient.mockReturnValue(
      makeSyncRouteClient({
        existingJob: { id: 'existing-job-1', status: 'processing' },
      }),
    );

    const res = await POST(
      makeJsonRequest('/api/erp/sync', { entity_type: 'account', entity_id: VALID_ENTITY_ID }),
    );

    expect(res.status).toBe(202);
    await expect(res.json()).resolves.toEqual({
      job_id: 'existing-job-1',
      status: 'running',
      entity_type: 'account',
      entity_id: VALID_ENTITY_ID,
      poll_url: '/api/erp/sync/existing-job-1',
    });
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});
