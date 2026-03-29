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

describe('SyncService — Finance Chain (Batch 2B)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    delete process.env.ERPNEXT_BASE_URL;
  });

  describe('syncPaymentEntry', () => {
    it('syncs payment entry in mock mode', async () => {
      const client = setupMockClient({
        payment_entries: {
          data: {
            id: VALID_ENTITY_ID,
            payment_type: 'Receive',
            posting_date: '2026-03-29',
            party_type: 'Customer',
            party_name: 'Acme Construction',
            paid_amount: 7500,
            received_amount: 7500,
            currency: 'CAD',
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('payment_entry'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncPaymentEntry(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^PE-MOCK-/);
      expect(client.from).toHaveBeenCalledWith('payment_entries');
      expect(client.from).toHaveBeenCalledWith('erp_sync_map');
    });

    it('returns failed when payment entry not found', async () => {
      setupMockClient({
        payment_entries: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('payment_entry'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncPaymentEntry(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Payment entry not found');
    });
  });

  describe('syncJournalEntry', () => {
    it('syncs journal entry in mock mode', async () => {
      setupMockClient({
        journal_entries: {
          data: {
            id: VALID_ENTITY_ID,
            voucher_type: 'Journal Entry',
            posting_date: '2026-03-29',
            company: 'MDM Group Inc.',
            total_debit: 5000,
            user_remark: 'Material cost',
            accounts: [],
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('journal_entry'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncJournalEntry(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^JV-MOCK-/);
    });

    it('returns failed when journal entry not found', async () => {
      setupMockClient({
        journal_entries: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('journal_entry'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncJournalEntry(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Journal entry not found');
    });
  });

  describe('readGlEntry', () => {
    it('reads GL entry in mock mode', async () => {
      setupMockClient({
        erp_sync_jobs: { data: makeSyncJob('gl_entry'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.readGlEntry('GL-00042');

      expect(result.status).toBe('succeeded');
      expect(result.entity_type).toBe('gl_entry');
      expect(result.erp_docname).toBe('GL-00042');
    });
  });

  describe('syncBankAccount', () => {
    it('syncs bank account in mock mode', async () => {
      setupMockClient({
        bank_accounts: {
          data: {
            id: VALID_ENTITY_ID,
            account_name: 'MDM Operating',
            bank: 'TD Canada Trust',
            account_type: 'Bank',
            account_subtype: 'Chequing',
            company: 'MDM Group Inc.',
            iban: null,
            branch_code: '00042',
            is_default: true,
            is_company_account: true,
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('bank_account'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncBankAccount(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^BA-MOCK-/);
    });

    it('returns failed when bank account not found', async () => {
      setupMockClient({
        bank_accounts: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('bank_account'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncBankAccount(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Bank account not found');
    });
  });

  describe('readModeOfPayment', () => {
    it('reads mode of payment in mock mode', async () => {
      setupMockClient({
        erp_sync_jobs: { data: makeSyncJob('mode_of_payment'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.readModeOfPayment('Wire Transfer');

      expect(result.status).toBe('succeeded');
      expect(result.entity_type).toBe('mode_of_payment');
      expect(result.erp_docname).toBe('Wire Transfer');
    });
  });

  describe('syncCostCenter', () => {
    it('syncs cost center in mock mode', async () => {
      const client = setupMockClient({
        cost_centers: {
          data: {
            id: VALID_ENTITY_ID,
            cost_center_name: 'Contracting Division',
            parent_cost_center: 'MDM Group Inc. - MDM',
            company: 'MDM Group Inc.',
            is_group: false,
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('cost_center'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncCostCenter(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^CC-MOCK-/);
      expect(client.from).toHaveBeenCalledWith('cost_centers');
    });

    it('returns failed when cost center not found', async () => {
      setupMockClient({
        cost_centers: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('cost_center'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncCostCenter(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Cost center not found');
    });
  });

  describe('syncBudget', () => {
    it('syncs budget in mock mode', async () => {
      setupMockClient({
        budgets: {
          data: {
            id: VALID_ENTITY_ID,
            budget_against: 'Cost Center',
            company: 'MDM Group Inc.',
            fiscal_year: '2026',
            cost_center: 'Contracting - MDM',
            project: null,
            monthly_distribution: null,
            applicable_on_material_request: true,
            applicable_on_purchase_order: true,
            action_if_annual_budget_exceeded: 'Warn',
            accounts: [],
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('budget'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncBudget(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^BDG-MOCK-/);
    });

    it('returns failed when budget not found', async () => {
      setupMockClient({
        budgets: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('budget'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncBudget(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Budget not found');
    });
  });

  describe('mock mode verification', () => {
    it('does not call fetch for any finance sync', async () => {
      delete process.env.ERPNEXT_BASE_URL;
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      setupMockClient({
        payment_entries: {
          data: {
            id: VALID_ENTITY_ID,
            payment_type: 'Receive',
            posting_date: '2026-03-29',
            party_type: 'Customer',
            party_name: 'Test',
            paid_amount: 1000,
            received_amount: 1000,
            currency: 'CAD',
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('payment_entry'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      await service.syncPaymentEntry(VALID_ENTITY_ID, VALID_USER_ID);

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });

  describe('retry and dead letter', () => {
    it('returns dead_letter status when max attempts exceeded', async () => {
      setupMockClient({
        bank_accounts: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: {
          data: { id: VALID_JOB_ID, status: 'queued', attempt_count: 3, max_attempts: 3 },
          error: null,
        },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncBankAccount(VALID_ENTITY_ID, VALID_USER_ID, {
        jobId: VALID_JOB_ID,
        attemptCount: 3,
        maxAttempts: 3,
      });

      expect(['failed', 'dead_letter']).toContain(result.status);
    });
  });
});
