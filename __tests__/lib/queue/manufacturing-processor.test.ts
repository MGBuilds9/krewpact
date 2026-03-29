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

describe('processJob — Manufacturing/Inventory Chain (Batch 2C)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    delete process.env.ERPNEXT_BASE_URL;
  });

  const manufacturingJobs: [JobType, string, Record<string, unknown>][] = [
    [
      JobType.ERPSyncBom,
      'inventory_bom',
      {
        id: VALID_ENTITY_ID,
        item_code: 'ASSY-001',
        item_name: 'Cable Assembly Kit',
        quantity: 1,
        is_active: true,
        is_default: true,
        currency: 'CAD',
        remarks: null,
        items: [],
      },
    ],
    [
      JobType.ERPSyncWorkOrder,
      'work_orders',
      {
        id: VALID_ENTITY_ID,
        production_item: 'ASSY-001',
        item_name: 'Cable Assembly Kit',
        bom_no: 'BOM-ASSY-001-001',
        qty: 10,
        planned_start_date: '2026-04-01',
        expected_delivery_date: null,
        project_name: null,
        remarks: null,
      },
    ],
    [
      JobType.ERPSyncQualityInspection,
      'quality_inspections',
      {
        id: VALID_ENTITY_ID,
        inspection_type: 'Incoming',
        reference_type: 'Purchase Receipt',
        reference_name: 'PR-001',
        item_code: 'CABLE-001',
        item_name: 'Copper Cable',
        sample_size: 5,
        inspected_by: null,
        inspection_date: '2026-03-29',
        remarks: null,
        readings: [],
      },
    ],
    [
      JobType.ERPSyncSerialNo,
      'serial_numbers',
      {
        id: VALID_ENTITY_ID,
        serial_no: 'SN-001',
        item_code: 'CABLE-001',
        item_name: 'Copper Cable',
        warehouse: 'Main Warehouse',
        status: 'Active',
        purchase_date: null,
        warranty_expiry_date: null,
        description: null,
      },
    ],
    [
      JobType.ERPSyncBatch,
      'batches',
      {
        id: VALID_ENTITY_ID,
        batch_id: 'BATCH-001',
        item_code: 'CABLE-001',
        item_name: 'Copper Cable',
        expiry_date: null,
        manufacturing_date: null,
        description: null,
      },
    ],
    [
      JobType.ERPSyncUom,
      'units_of_measure',
      {
        id: VALID_ENTITY_ID,
        uom_name: 'Spool',
        must_be_whole_number: true,
      },
    ],
    [
      JobType.ERPSyncItemPrice,
      'item_prices',
      {
        id: VALID_ENTITY_ID,
        item_code: 'CABLE-001',
        item_name: 'Copper Cable',
        price_list: 'Standard Buying',
        price_list_rate: 50.0,
        currency: 'CAD',
        uom: null,
        min_qty: 0,
        valid_from: null,
        valid_upto: null,
      },
    ],
    [
      JobType.ERPSyncPriceList,
      'price_lists',
      {
        id: VALID_ENTITY_ID,
        price_list_name: 'Standard Buying',
        currency: 'CAD',
        buying: true,
        selling: false,
        enabled: true,
      },
    ],
  ];

  it.each(manufacturingJobs)(
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

  it.each(manufacturingJobs)(
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
    it('has all manufacturing chain job types', () => {
      expect(JobType.ERPSyncBom).toBe('erp-sync-bom');
      expect(JobType.ERPSyncWorkOrder).toBe('erp-sync-work-order');
      expect(JobType.ERPSyncQualityInspection).toBe('erp-sync-quality-inspection');
      expect(JobType.ERPSyncSerialNo).toBe('erp-sync-serial-no');
      expect(JobType.ERPSyncBatch).toBe('erp-sync-batch');
      expect(JobType.ERPSyncUom).toBe('erp-sync-uom');
      expect(JobType.ERPSyncItemPrice).toBe('erp-sync-item-price');
      expect(JobType.ERPSyncPriceList).toBe('erp-sync-price-list');
    });
  });
});
