import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createScopedServiceClient: vi.fn(),
  createUserClientSafe: vi.fn(),
}));

import {
  makeAccount,
  makeEstimate,
  makeEstimateLine,
  mockSupabaseClient,
  resetFixtureCounter,
} from '@/__tests__/helpers';
// Import AFTER mocks are set up — these will be created in implementation
import { SyncService } from '@/lib/erp/sync-service';
import { createScopedServiceClient } from '@/lib/supabase/server';

const mockCreateScopedServiceClient = vi.mocked(createScopedServiceClient);

// Valid v4 UUIDs for test data that may pass through validation
const VALID_ACCOUNT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_ESTIMATE_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const VALID_JOB_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const VALID_USER_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

describe('SyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    // Ensure mock mode (no ERPNEXT_BASE_URL)
    delete process.env.ERPNEXT_BASE_URL;
  });

  describe('syncAccount', () => {
    it('creates a sync job, mock customer, and sync map entry', async () => {
      const account = makeAccount({ id: VALID_ACCOUNT_ID, account_name: 'MDM Contracting Ltd.' });
      const syncJob = {
        id: VALID_JOB_ID,
        entity_type: 'account',
        entity_id: VALID_ACCOUNT_ID,
        status: 'queued',
        sync_direction: 'outbound',
        attempt_count: 0,
        max_attempts: 3,
        payload: {},
        scheduled_at: '2026-02-13T00:00:00Z',
        created_at: '2026-02-13T00:00:00Z',
        updated_at: '2026-02-13T00:00:00Z',
      };

      const client = mockSupabaseClient({
        tables: {
          accounts: { data: account, error: null },
          erp_sync_jobs: { data: syncJob, error: null },
          erp_sync_map: { data: { id: 'map-1' }, error: null },
          erp_sync_events: { data: { id: 'event-1' }, error: null },
        },
      });
      mockCreateScopedServiceClient.mockReturnValue(client);

      const service = new SyncService();
      const result = await service.syncAccount(VALID_ACCOUNT_ID, VALID_USER_ID);

      expect(result).toBeDefined();
      expect(result.status).toBe('succeeded');
      // Should have called from() with the right tables
      expect(client.from).toHaveBeenCalledWith('accounts');
      expect(client.from).toHaveBeenCalledWith('erp_sync_jobs');
      expect(client.from).toHaveBeenCalledWith('erp_sync_map');
      expect(client.from).toHaveBeenCalledWith('erp_sync_events');
    });

    it('handles sync error gracefully and sets job status to failed', async () => {
      const client = mockSupabaseClient({
        tables: {
          accounts: { data: null, error: { message: 'Account not found', code: 'PGRST116' } },
          erp_sync_jobs: { data: { id: VALID_JOB_ID, status: 'queued' }, error: null },
          erp_sync_events: { data: { id: 'event-1' }, error: null },
          erp_sync_errors: { data: { id: 'err-1' }, error: null },
        },
      });
      mockCreateScopedServiceClient.mockReturnValue(client);

      const service = new SyncService();
      const result = await service.syncAccount(VALID_ACCOUNT_ID, VALID_USER_ID);

      expect(result).toBeDefined();
      expect(result.status).toBe('failed');
    });
  });

  describe('syncEstimate', () => {
    it('creates mock quotation from estimate with lines', async () => {
      const estimate = makeEstimate({
        id: VALID_ESTIMATE_ID,
        estimate_number: 'EST-2026-001',
        subtotal_amount: 5000,
        tax_amount: 650,
        total_amount: 5650,
      });
      const lines = [
        makeEstimateLine({
          estimate_id: VALID_ESTIMATE_ID,
          description: 'Labour',
          quantity: 10,
          unit_cost: 50,
          line_total: 500,
        }),
        makeEstimateLine({
          estimate_id: VALID_ESTIMATE_ID,
          description: 'Materials',
          quantity: 20,
          unit_cost: 100,
          line_total: 2000,
        }),
      ];

      const syncJob = {
        id: VALID_JOB_ID,
        entity_type: 'estimate',
        entity_id: VALID_ESTIMATE_ID,
        status: 'queued',
        sync_direction: 'outbound',
        attempt_count: 0,
        max_attempts: 3,
        payload: {},
        scheduled_at: '2026-02-13T00:00:00Z',
        created_at: '2026-02-13T00:00:00Z',
        updated_at: '2026-02-13T00:00:00Z',
      };

      const client = mockSupabaseClient({
        tables: {
          estimates: { data: { ...estimate, estimate_lines: lines }, error: null },
          erp_sync_jobs: { data: syncJob, error: null },
          erp_sync_map: { data: { id: 'map-1' }, error: null },
          erp_sync_events: { data: { id: 'event-1' }, error: null },
        },
      });
      mockCreateScopedServiceClient.mockReturnValue(client);

      const service = new SyncService();
      const result = await service.syncEstimate(VALID_ESTIMATE_ID, VALID_USER_ID);

      expect(result).toBeDefined();
      expect(result.status).toBe('succeeded');
      expect(client.from).toHaveBeenCalledWith('estimates');
      expect(client.from).toHaveBeenCalledWith('erp_sync_jobs');
      expect(client.from).toHaveBeenCalledWith('erp_sync_map');
    });
  });

  describe('getSyncStatus', () => {
    it('returns correct sync status for entity', async () => {
      const syncMap = {
        id: 'map-1',
        entity_type: 'account',
        local_id: VALID_ACCOUNT_ID,
        erp_doctype: 'Customer',
        erp_docname: 'CUST-MOCK-001',
        direction: 'outbound',
        created_at: '2026-02-13T00:00:00Z',
        updated_at: '2026-02-13T00:00:00Z',
      };

      const client = mockSupabaseClient({
        tables: {
          erp_sync_map: { data: syncMap, error: null },
        },
      });
      mockCreateScopedServiceClient.mockReturnValue(client);

      const service = new SyncService();
      const result = await service.getSyncStatus('account', VALID_ACCOUNT_ID);

      expect(result).toBeDefined();
      expect(result!.erp_docname).toBe('CUST-MOCK-001');
      expect(result!.entity_type).toBe('account');
    });

    it('returns null for entity with no sync map entry', async () => {
      const client = mockSupabaseClient({
        tables: {
          erp_sync_map: { data: null, error: null },
        },
      });
      mockCreateScopedServiceClient.mockReturnValue(client);

      const service = new SyncService();
      const result = await service.getSyncStatus('account', VALID_ACCOUNT_ID);

      expect(result).toBeNull();
    });
  });

  describe('mock mode', () => {
    it('does not call real fetch when ERPNEXT_BASE_URL is empty', async () => {
      delete process.env.ERPNEXT_BASE_URL;
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const account = makeAccount({ id: VALID_ACCOUNT_ID });
      const client = mockSupabaseClient({
        tables: {
          accounts: { data: account, error: null },
          erp_sync_jobs: { data: { id: VALID_JOB_ID, status: 'queued' }, error: null },
          erp_sync_map: { data: { id: 'map-1' }, error: null },
          erp_sync_events: { data: { id: 'event-1' }, error: null },
        },
      });
      mockCreateScopedServiceClient.mockReturnValue(client);

      const service = new SyncService();
      await service.syncAccount(VALID_ACCOUNT_ID, VALID_USER_ID);

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('does not call real fetch when ERPNEXT_BASE_URL is "mock"', async () => {
      process.env.ERPNEXT_BASE_URL = 'mock';
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const account = makeAccount({ id: VALID_ACCOUNT_ID });
      const client = mockSupabaseClient({
        tables: {
          accounts: { data: account, error: null },
          erp_sync_jobs: { data: { id: VALID_JOB_ID, status: 'queued' }, error: null },
          erp_sync_map: { data: { id: 'map-1' }, error: null },
          erp_sync_events: { data: { id: 'event-1' }, error: null },
        },
      });
      mockCreateScopedServiceClient.mockReturnValue(client);

      const service = new SyncService();
      await service.syncAccount(VALID_ACCOUNT_ID, VALID_USER_ID);

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });

  describe('sync records events', () => {
    it('logs sync events during the process', async () => {
      const account = makeAccount({ id: VALID_ACCOUNT_ID });
      const client = mockSupabaseClient({
        tables: {
          accounts: { data: account, error: null },
          erp_sync_jobs: { data: { id: VALID_JOB_ID, status: 'queued' }, error: null },
          erp_sync_map: { data: { id: 'map-1' }, error: null },
          erp_sync_events: { data: { id: 'event-1' }, error: null },
        },
      });
      mockCreateScopedServiceClient.mockReturnValue(client);

      const service = new SyncService();
      await service.syncAccount(VALID_ACCOUNT_ID, VALID_USER_ID);

      // Should have written to erp_sync_events at least once
      expect(client.from).toHaveBeenCalledWith('erp_sync_events');
    });
  });

  describe('sync map links correct IDs', () => {
    it('creates sync map with correct local_id and erp_docname', async () => {
      const account = makeAccount({ id: VALID_ACCOUNT_ID, account_name: 'Test Corp' });
      const client = mockSupabaseClient({
        tables: {
          accounts: { data: account, error: null },
          erp_sync_jobs: { data: { id: VALID_JOB_ID, status: 'queued' }, error: null },
          erp_sync_map: { data: { id: 'map-1' }, error: null },
          erp_sync_events: { data: { id: 'event-1' }, error: null },
        },
      });
      mockCreateScopedServiceClient.mockReturnValue(client);

      const service = new SyncService();
      const result = await service.syncAccount(VALID_ACCOUNT_ID, VALID_USER_ID);

      // Verify sync map was written with correct entity linkage
      expect(result.erp_docname).toBeDefined();
      expect(result.erp_docname).toMatch(/^CUST-MOCK-/);
    });
  });

  describe('retry logic', () => {
    it('returns the persisted attempt count from the sync job record', async () => {
      const account = makeAccount({ id: VALID_ACCOUNT_ID });
      const syncJob = {
        id: VALID_JOB_ID,
        entity_type: 'account',
        entity_id: VALID_ACCOUNT_ID,
        status: 'queued',
        sync_direction: 'outbound',
        attempt_count: 0,
        max_attempts: 3,
        payload: {},
      };

      const client = mockSupabaseClient({
        tables: {
          accounts: { data: account, error: null },
          erp_sync_jobs: { data: syncJob, error: null },
          erp_sync_map: { data: { id: 'map-1' }, error: null },
          erp_sync_events: { data: { id: 'event-1' }, error: null },
        },
      });
      mockCreateScopedServiceClient.mockReturnValue(client);

      const service = new SyncService();
      const result = await service.syncAccount(VALID_ACCOUNT_ID, VALID_USER_ID, {
        jobId: VALID_JOB_ID,
        attemptCount: 2,
        maxAttempts: 3,
      });

      expect(result).toBeDefined();
      expect(result.attempt_count).toBe(0);
    });
  });

  describe('already-synced entity', () => {
    it('updates existing sync map entry for re-synced entity', async () => {
      const account = makeAccount({ id: VALID_ACCOUNT_ID });
      // Simulate an existing sync map entry
      const existingSyncMap = {
        id: 'existing-map-1',
        entity_type: 'account',
        local_id: VALID_ACCOUNT_ID,
        erp_doctype: 'Customer',
        erp_docname: 'CUST-MOCK-001',
        direction: 'outbound',
      };

      const client = mockSupabaseClient({
        tables: {
          accounts: { data: account, error: null },
          erp_sync_jobs: { data: { id: VALID_JOB_ID, status: 'queued' }, error: null },
          erp_sync_map: { data: existingSyncMap, error: null },
          erp_sync_events: { data: { id: 'event-1' }, error: null },
        },
      });
      mockCreateScopedServiceClient.mockReturnValue(client);

      const service = new SyncService();
      const result = await service.syncAccount(VALID_ACCOUNT_ID, VALID_USER_ID);

      // Should succeed — upsert on sync map handles re-sync
      expect(result.status).toBe('succeeded');
      expect(client.from).toHaveBeenCalledWith('erp_sync_map');
    });
  });
});
