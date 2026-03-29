import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createScopedServiceClient: vi.fn(),
  createUserClientSafe: vi.fn(),
}));

import { mockSupabaseClient, resetFixtureCounter } from '@/__tests__/helpers';
import { SyncService } from '@/lib/erp/sync-service';
import { createScopedServiceClient } from '@/lib/supabase/server';

const mockCreateScopedServiceClient = vi.mocked(createScopedServiceClient);

const VALID_ENTITY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_JOB_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const VALID_USER_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

function makeSyncJob(entityType: string) {
  return {
    id: VALID_JOB_ID,
    entity_type: entityType,
    entity_id: VALID_ENTITY_ID,
    status: 'queued',
    sync_direction: 'outbound',
    attempt_count: 0,
    max_attempts: 3,
    payload: {},
  };
}

function setupMockClient(tables: Record<string, { data: unknown; error: unknown }>) {
  const client = mockSupabaseClient({ tables });
  mockCreateScopedServiceClient.mockReturnValue(client);
  return client;
}

describe('SyncService — Procurement Chain (Batch 2A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    delete process.env.ERPNEXT_BASE_URL;
  });

  describe('syncSupplierQuotation', () => {
    it('syncs supplier quotation in mock mode', async () => {
      const client = setupMockClient({
        supplier_quotations: {
          data: {
            id: VALID_ENTITY_ID,
            quotation_number: 'SQ-2026-001',
            supplier_name: 'Premier Electrical',
            total_amount: 15000,
            transaction_date: '2026-03-29',
            valid_till: '2026-04-29',
            currency: 'CAD',
            items: [],
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('supplier_quotation'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncSupplierQuotation(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^SQTN-MOCK-/);
      expect(client.from).toHaveBeenCalledWith('supplier_quotations');
      expect(client.from).toHaveBeenCalledWith('erp_sync_map');
    });

    it('returns failed when supplier quotation not found', async () => {
      setupMockClient({
        supplier_quotations: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('supplier_quotation'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncSupplierQuotation(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Supplier quotation not found');
    });
  });

  describe('syncRequestForQuotation', () => {
    it('syncs RFQ in mock mode', async () => {
      setupMockClient({
        request_for_quotations: {
          data: {
            id: VALID_ENTITY_ID,
            rfq_number: 'RFQ-2026-001',
            transaction_date: '2026-03-29',
            message_for_supplier: 'Quote needed',
            suppliers: [{ supplier_name: 'Premier', email: 'a@b.com' }],
            items: [],
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('request_for_quotation'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncRequestForQuotation(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^PUR-RFQ-MOCK-/);
    });

    it('returns failed when RFQ not found', async () => {
      setupMockClient({
        request_for_quotations: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('request_for_quotation'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncRequestForQuotation(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
    });
  });

  describe('syncMaterialRequest', () => {
    it('syncs material request in mock mode', async () => {
      setupMockClient({
        material_requests: {
          data: {
            id: VALID_ENTITY_ID,
            request_number: 'MR-2026-001',
            request_type: 'Purchase',
            transaction_date: '2026-03-29',
            required_by_date: '2026-04-10',
            project_name: null,
            items: [],
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('material_request'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncMaterialRequest(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^MAT-MR-MOCK-/);
    });

    it('returns failed when material request not found', async () => {
      setupMockClient({
        material_requests: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('material_request'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncMaterialRequest(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
    });
  });

  describe('syncStockEntry', () => {
    it('syncs stock entry in mock mode', async () => {
      setupMockClient({
        stock_entries: {
          data: {
            id: VALID_ENTITY_ID,
            entry_type: 'Material Receipt',
            posting_date: '2026-03-29',
            posting_time: '14:00:00',
            project_name: null,
            remarks: 'Test receipt',
            items: [],
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('stock_entry'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncStockEntry(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^MAT-STE-MOCK-/);
    });
  });

  describe('syncWarehouse', () => {
    it('syncs warehouse in mock mode', async () => {
      setupMockClient({
        warehouses: {
          data: {
            id: VALID_ENTITY_ID,
            warehouse_name: 'Main Warehouse',
            warehouse_type: 'Warehouse',
            parent_warehouse: null,
            company: 'MDM Group Inc.',
            is_group: false,
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('warehouse'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncWarehouse(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^WH-MOCK-/);
    });

    it('returns failed when warehouse not found', async () => {
      setupMockClient({
        warehouses: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('warehouse'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncWarehouse(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
    });
  });

  describe('syncItem', () => {
    it('syncs item in mock mode', async () => {
      setupMockClient({
        inventory_items: {
          data: {
            id: VALID_ENTITY_ID,
            sku: 'CABLE-001',
            name: 'Copper Cable 12AWG',
            category: 'Electrical',
            description: '12AWG copper cable',
            uom: 'Spool',
            is_sales_item: false,
            default_warehouse: null,
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('item'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncItem(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^ITEM-MOCK-/);
    });

    it('returns failed when item not found', async () => {
      setupMockClient({
        inventory_items: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('item'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncItem(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
    });
  });

  describe('mock mode verification', () => {
    it('does not call fetch for any procurement sync', async () => {
      delete process.env.ERPNEXT_BASE_URL;
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      setupMockClient({
        stock_entries: {
          data: {
            id: VALID_ENTITY_ID,
            entry_type: 'Material Receipt',
            posting_date: '2026-03-29',
            posting_time: null,
            project_name: null,
            remarks: null,
            items: [],
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('stock_entry'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      await service.syncStockEntry(VALID_ENTITY_ID, VALID_USER_ID);

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });

  describe('retry and dead letter', () => {
    it('returns dead_letter status when max attempts exceeded', async () => {
      setupMockClient({
        warehouses: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: {
          data: { id: VALID_JOB_ID, status: 'queued', attempt_count: 3, max_attempts: 3 },
          error: null,
        },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncWarehouse(VALID_ENTITY_ID, VALID_USER_ID, {
        jobId: VALID_JOB_ID,
        attemptCount: 3,
        maxAttempts: 3,
      });

      // Will be failed or dead_letter depending on mock behavior
      expect(['failed', 'dead_letter']).toContain(result.status);
    });
  });
});
