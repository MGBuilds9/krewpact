import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createScopedServiceClient: vi.fn(),
  createUserClientSafe: vi.fn(),
}));

vi.mock('@/lib/takeoff/feedback', () => ({
  submitFeedbackToEngine: vi.fn(),
}));

import { mockSupabaseClient, resetFixtureCounter } from '@/__tests__/helpers';
import { processJob } from '@/lib/queue/processor';
import { type Job, JobType } from '@/lib/queue/types';
import { createScopedServiceClient } from '@/lib/supabase/server';

const mockCreateScopedServiceClient = vi.mocked(createScopedServiceClient);

const VALID_ENTITY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_JOB_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const VALID_USER_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

function makeJob(type: JobType, entityId: string = VALID_ENTITY_ID): Job {
  return {
    id: VALID_JOB_ID,
    type,
    payload: {
      entityId,
      userId: VALID_USER_ID,
    },
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'pending',
    nextRunAt: new Date(),
  };
}

describe('processJob — Procurement Chain (Batch 2A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    delete process.env.ERPNEXT_BASE_URL;
  });

  const procurementJobs: [JobType, string, Record<string, unknown>][] = [
    [
      JobType.ERPSyncSupplierQuotation,
      'supplier_quotations',
      {
        id: VALID_ENTITY_ID,
        quotation_number: 'SQ-001',
        supplier_name: 'Test Supplier',
        total_amount: 1000,
        transaction_date: '2026-03-29',
        valid_till: null,
        currency: 'CAD',
        items: [],
      },
    ],
    [
      JobType.ERPSyncRequestForQuotation,
      'request_for_quotations',
      {
        id: VALID_ENTITY_ID,
        rfq_number: 'RFQ-001',
        transaction_date: '2026-03-29',
        message_for_supplier: null,
        suppliers: [],
        items: [],
      },
    ],
    [
      JobType.ERPSyncMaterialRequest,
      'material_requests',
      {
        id: VALID_ENTITY_ID,
        request_number: 'MR-001',
        request_type: 'Purchase',
        transaction_date: '2026-03-29',
        required_by_date: null,
        project_name: null,
        items: [],
      },
    ],
    [
      JobType.ERPSyncStockEntry,
      'stock_entries',
      {
        id: VALID_ENTITY_ID,
        entry_type: 'Material Receipt',
        posting_date: '2026-03-29',
        posting_time: null,
        project_name: null,
        remarks: null,
        items: [],
      },
    ],
    [
      JobType.ERPSyncWarehouse,
      'warehouses',
      {
        id: VALID_ENTITY_ID,
        warehouse_name: 'Test Warehouse',
        warehouse_type: 'Warehouse',
        parent_warehouse: null,
        company: 'MDM Group Inc.',
        is_group: false,
      },
    ],
    [
      JobType.ERPSyncItem,
      'inventory_items',
      {
        id: VALID_ENTITY_ID,
        sku: 'TEST-001',
        name: 'Test Item',
        category: 'General',
        description: 'Test item description',
        uom: 'Nos',
        is_sales_item: false,
        default_warehouse: null,
      },
    ],
  ];

  it.each(procurementJobs)(
    'processes %s job type successfully in mock mode',
    async (jobType, tableName, entityData) => {
      const client = mockSupabaseClient({
        tables: {
          [tableName]: { data: entityData, error: null },
          erp_sync_jobs: {
            data: {
              id: VALID_JOB_ID,
              status: 'queued',
              attempt_count: 0,
              max_attempts: 3,
            },
            error: null,
          },
          erp_sync_map: { data: { id: 'map-1' }, error: null },
          erp_sync_events: { data: { id: 'event-1' }, error: null },
        },
      });
      mockCreateScopedServiceClient.mockReturnValue(client);

      const job = makeJob(jobType);
      await expect(processJob(job)).resolves.not.toThrow();
    },
  );

  it.each(procurementJobs)(
    'handles entity not found for %s by throwing (triggers retry)',
    async (jobType, tableName) => {
      const client = mockSupabaseClient({
        tables: {
          [tableName]: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
          erp_sync_jobs: {
            data: {
              id: VALID_JOB_ID,
              status: 'queued',
              attempt_count: 0,
              max_attempts: 3,
            },
            error: null,
          },
          erp_sync_events: { data: { id: 'event-1' }, error: null },
          erp_sync_errors: { data: { id: 'err-1' }, error: null },
        },
      });
      mockCreateScopedServiceClient.mockReturnValue(client);

      const job = makeJob(jobType);
      // processJob throws on failed status — queue runner catches and retries
      await expect(processJob(job)).rejects.toThrow('not found');
    },
  );

  describe('JobType enum values', () => {
    it('has all procurement chain job types', () => {
      expect(JobType.ERPSyncSupplierQuotation).toBe('erp-sync-supplier-quotation');
      expect(JobType.ERPSyncRequestForQuotation).toBe('erp-sync-request-for-quotation');
      expect(JobType.ERPSyncMaterialRequest).toBe('erp-sync-material-request');
      expect(JobType.ERPSyncStockEntry).toBe('erp-sync-stock-entry');
      expect(JobType.ERPSyncWarehouse).toBe('erp-sync-warehouse');
      expect(JobType.ERPSyncItem).toBe('erp-sync-item');
    });
  });
});
