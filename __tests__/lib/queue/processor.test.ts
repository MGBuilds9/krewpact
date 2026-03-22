/**
 * Tests for the queue processor — verifies that each JobType
 * dispatches to the correct SyncService method.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSyncService } = vi.hoisted(() => ({
  mockSyncService: {
    syncAccount: vi.fn().mockResolvedValue({ status: 'succeeded' }),
    syncEstimate: vi.fn().mockResolvedValue({ status: 'succeeded' }),
    syncOpportunity: vi.fn().mockResolvedValue({ status: 'succeeded' }),
    syncWonDeal: vi.fn().mockResolvedValue({ status: 'succeeded' }),
    syncContact: vi.fn().mockResolvedValue({ status: 'succeeded' }),
    syncProject: vi.fn().mockResolvedValue({ status: 'succeeded' }),
    syncTask: vi.fn().mockResolvedValue({ status: 'succeeded' }),
    syncSupplier: vi.fn().mockResolvedValue({ status: 'succeeded' }),
    syncExpenseClaim: vi.fn().mockResolvedValue({ status: 'succeeded' }),
    syncTimesheet: vi.fn().mockResolvedValue({ status: 'succeeded' }),
    readSalesInvoice: vi.fn().mockResolvedValue({ status: 'succeeded' }),
    readPurchaseInvoice: vi.fn().mockResolvedValue({ status: 'succeeded' }),
  },
}));

vi.mock('@/lib/erp/sync-service', () => ({
  SyncService: class MockSyncService {
    syncAccount = mockSyncService.syncAccount;
    syncEstimate = mockSyncService.syncEstimate;
    syncOpportunity = mockSyncService.syncOpportunity;
    syncWonDeal = mockSyncService.syncWonDeal;
    syncContact = mockSyncService.syncContact;
    syncProject = mockSyncService.syncProject;
    syncTask = mockSyncService.syncTask;
    syncSupplier = mockSyncService.syncSupplier;
    syncExpenseClaim = mockSyncService.syncExpenseClaim;
    syncTimesheet = mockSyncService.syncTimesheet;
    readSalesInvoice = mockSyncService.readSalesInvoice;
    readPurchaseInvoice = mockSyncService.readPurchaseInvoice;
  },
}));

import { processJob } from '@/lib/queue/processor';
import type { Job } from '@/lib/queue/types';
import { JobType } from '@/lib/queue/types';

function makeJob(type: JobType, entityId = 'entity-1', userId = 'user-1'): Job {
  return {
    id: 'job-1',
    type,
    payload: { entityId, userId },
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'running',
    nextRunAt: new Date(),
  };
}

describe('processJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches ERPSyncAccount to syncAccount', async () => {
    await processJob(makeJob(JobType.ERPSyncAccount));
    expect(mockSyncService.syncAccount).toHaveBeenCalledWith('entity-1', 'user-1', undefined);
  });

  it('dispatches ERPSyncEstimate to syncEstimate', async () => {
    await processJob(makeJob(JobType.ERPSyncEstimate));
    expect(mockSyncService.syncEstimate).toHaveBeenCalledWith('entity-1', 'user-1', undefined);
  });

  it('dispatches ERPSyncOpportunity to syncOpportunity', async () => {
    await processJob(makeJob(JobType.ERPSyncOpportunity));
    expect(mockSyncService.syncOpportunity).toHaveBeenCalledWith('entity-1', 'user-1', undefined);
  });

  it('dispatches ERPSyncSalesOrder to syncWonDeal', async () => {
    await processJob({
      ...makeJob(JobType.ERPSyncSalesOrder),
      payload: {
        entityId: 'entity-1',
        userId: 'user-1',
        meta: { wonDate: '2026-03-21' },
      },
    });
    expect(mockSyncService.syncWonDeal).toHaveBeenCalledWith(
      'entity-1',
      'user-1',
      '2026-03-21',
      undefined,
    );
  });

  it('dispatches ERPSyncContact to syncContact', async () => {
    await processJob(makeJob(JobType.ERPSyncContact));
    expect(mockSyncService.syncContact).toHaveBeenCalledWith('entity-1', 'user-1', undefined);
  });

  it('dispatches ERPSyncProject to syncProject', async () => {
    await processJob(makeJob(JobType.ERPSyncProject));
    expect(mockSyncService.syncProject).toHaveBeenCalledWith('entity-1', 'user-1', undefined);
  });

  it('dispatches ERPSyncTask to syncTask', async () => {
    await processJob(makeJob(JobType.ERPSyncTask));
    expect(mockSyncService.syncTask).toHaveBeenCalledWith('entity-1', 'user-1', undefined);
  });

  it('dispatches ERPSyncSupplier to syncSupplier', async () => {
    await processJob(makeJob(JobType.ERPSyncSupplier));
    expect(mockSyncService.syncSupplier).toHaveBeenCalledWith('entity-1', 'user-1', undefined);
  });

  it('dispatches ERPSyncExpense to syncExpenseClaim', async () => {
    await processJob(makeJob(JobType.ERPSyncExpense));
    expect(mockSyncService.syncExpenseClaim).toHaveBeenCalledWith('entity-1', 'user-1', undefined);
  });

  it('dispatches ERPSyncTimesheet to syncTimesheet', async () => {
    await processJob(makeJob(JobType.ERPSyncTimesheet));
    expect(mockSyncService.syncTimesheet).toHaveBeenCalledWith('entity-1', 'user-1', undefined);
  });

  it('dispatches ERPReadInvoice to readSalesInvoice', async () => {
    await processJob(makeJob(JobType.ERPReadInvoice, 'SINV-001'));
    expect(mockSyncService.readSalesInvoice).toHaveBeenCalledWith('SINV-001', undefined);
  });

  it('dispatches ERPReadPO to readPurchaseInvoice', async () => {
    await processJob(makeJob(JobType.ERPReadPO, 'PINV-001'));
    expect(mockSyncService.readPurchaseInvoice).toHaveBeenCalledWith('PINV-001', undefined);
  });
});
