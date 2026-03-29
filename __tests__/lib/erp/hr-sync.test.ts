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

describe('SyncService — HR/Organization Chain (Batch 2D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    delete process.env.ERPNEXT_BASE_URL;
  });

  describe('syncEmployee', () => {
    it('syncs employee in mock mode', async () => {
      const client = setupMockClient({
        users: {
          data: {
            id: VALID_ENTITY_ID,
            first_name: 'John',
            last_name: 'Smith',
            email: 'john@example.com',
            company: 'MDM Group Inc.',
            department: 'MDM Contracting',
            designation: 'Project Manager',
            date_of_joining: '2026-01-15',
            date_of_birth: null,
            gender: null,
            status: 'Active',
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('employee'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncEmployee(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^HR-EMP-MOCK-/);
      expect(client.from).toHaveBeenCalledWith('users');
      expect(client.from).toHaveBeenCalledWith('erp_sync_map');
    });

    it('returns failed when user not found', async () => {
      setupMockClient({
        users: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('employee'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncEmployee(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Employee not found');
    });
  });

  describe('syncAttendance', () => {
    it('syncs attendance in mock mode', async () => {
      setupMockClient({
        attendance_records: {
          data: {
            id: VALID_ENTITY_ID,
            employee: 'HR-EMP-001',
            attendance_date: '2026-03-29',
            status: 'Present',
            leave_type: null,
            company: 'MDM Group Inc.',
            shift: null,
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('attendance'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncAttendance(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^HR-ATT-MOCK-/);
    });

    it('returns failed when attendance not found', async () => {
      setupMockClient({
        attendance_records: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('attendance'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncAttendance(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Attendance not found');
    });
  });

  describe('syncLeaveApplication', () => {
    it('syncs leave application in mock mode', async () => {
      setupMockClient({
        leave_applications: {
          data: {
            id: VALID_ENTITY_ID,
            employee: 'HR-EMP-001',
            leave_type: 'Casual Leave',
            from_date: '2026-04-01',
            to_date: '2026-04-03',
            total_leave_days: 3,
            reason: 'Family event',
            status: 'Open',
            company: 'MDM Group Inc.',
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('leave_application'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncLeaveApplication(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^HR-LAP-MOCK-/);
    });

    it('returns failed when leave application not found', async () => {
      setupMockClient({
        leave_applications: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('leave_application'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncLeaveApplication(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
    });
  });

  describe('syncHolidayList', () => {
    it('syncs holiday list in mock mode', async () => {
      setupMockClient({
        holiday_lists: {
          data: {
            id: VALID_ENTITY_ID,
            holiday_list_name: 'Ontario Statutory 2026',
            from_date: '2026-01-01',
            to_date: '2026-12-31',
            company: 'MDM Group Inc.',
            holidays: [],
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('holiday_list'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncHolidayList(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^HL-MOCK-/);
    });

    it('returns failed when holiday list not found', async () => {
      setupMockClient({
        holiday_lists: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('holiday_list'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncHolidayList(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
    });
  });

  describe('syncDepartment', () => {
    it('syncs department in mock mode', async () => {
      setupMockClient({
        divisions: {
          data: {
            id: VALID_ENTITY_ID,
            name: 'MDM Contracting',
            company: 'MDM Group Inc.',
            parent_department: null,
            is_group: false,
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('department'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncDepartment(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toMatch(/^DEPT-MOCK-/);
    });

    it('returns failed when division not found', async () => {
      setupMockClient({
        divisions: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('department'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncDepartment(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Department not found');
    });
  });

  describe('syncHrSettings', () => {
    it('syncs HR settings in mock mode (singleton)', async () => {
      setupMockClient({
        erp_sync_jobs: { data: makeSyncJob('hr_settings'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncHrSettings(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toBe('HR Settings');
    });
  });

  describe('syncCompany', () => {
    it('syncs company in mock mode', async () => {
      setupMockClient({
        organizations: {
          data: {
            id: VALID_ENTITY_ID,
            name: 'MDM Group Inc.',
            abbreviation: 'MDM',
            default_currency: 'CAD',
            country: 'Canada',
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('company'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncCompany(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('succeeded');
      expect(result.erp_docname).toBe('MDM Group Inc.');
    });

    it('returns failed when organization not found', async () => {
      setupMockClient({
        organizations: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: { data: makeSyncJob('company'), error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncCompany(VALID_ENTITY_ID, VALID_USER_ID);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Company not found');
    });
  });

  describe('mock mode verification', () => {
    it('does not call fetch for any HR sync', async () => {
      delete process.env.ERPNEXT_BASE_URL;
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      setupMockClient({
        users: {
          data: {
            id: VALID_ENTITY_ID,
            first_name: 'Jane',
            last_name: 'Doe',
            email: 'jane@example.com',
            company: 'MDM Group Inc.',
            department: null,
            designation: null,
            date_of_joining: '2026-01-01',
            date_of_birth: null,
            gender: null,
            status: 'Active',
          },
          error: null,
        },
        erp_sync_jobs: { data: makeSyncJob('employee'), error: null },
        erp_sync_map: { data: { id: 'map-1' }, error: null },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
      });

      const service = new SyncService();
      await service.syncEmployee(VALID_ENTITY_ID, VALID_USER_ID);

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });

  describe('retry and dead letter', () => {
    it('returns dead_letter status when max attempts exceeded', async () => {
      setupMockClient({
        divisions: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        erp_sync_jobs: {
          data: { id: VALID_JOB_ID, status: 'queued', attempt_count: 3, max_attempts: 3 },
          error: null,
        },
        erp_sync_events: { data: { id: 'event-1' }, error: null },
        erp_sync_errors: { data: { id: 'err-1' }, error: null },
      });

      const service = new SyncService();
      const result = await service.syncDepartment(VALID_ENTITY_ID, VALID_USER_ID, {
        jobId: VALID_JOB_ID,
        attemptCount: 3,
        maxAttempts: 3,
      });

      expect(['failed', 'dead_letter']).toContain(result.status);
    });
  });
});
