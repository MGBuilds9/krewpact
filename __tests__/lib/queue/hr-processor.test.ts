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

describe('processJob — HR/Organization Chain (Batch 2D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    delete process.env.ERPNEXT_BASE_URL;
  });

  const hrJobs: [JobType, string, Record<string, unknown>][] = [
    [
      JobType.ERPSyncEmployee,
      'users',
      {
        id: VALID_ENTITY_ID,
        first_name: 'John',
        last_name: 'Smith',
        email: 'john@example.com',
        company: 'MDM Group Inc.',
        department: null,
        designation: null,
        date_of_joining: '2026-01-15',
        date_of_birth: null,
        gender: null,
        status: 'Active',
      },
    ],
    [
      JobType.ERPSyncAttendance,
      'attendance_records',
      {
        id: VALID_ENTITY_ID,
        employee: 'HR-EMP-001',
        attendance_date: '2026-03-29',
        status: 'Present',
        leave_type: null,
        company: 'MDM Group Inc.',
        shift: null,
      },
    ],
    [
      JobType.ERPSyncLeaveApplication,
      'leave_applications',
      {
        id: VALID_ENTITY_ID,
        employee: 'HR-EMP-001',
        leave_type: 'Casual Leave',
        from_date: '2026-04-01',
        to_date: '2026-04-03',
        total_leave_days: 3,
        reason: null,
        status: 'Open',
        company: 'MDM Group Inc.',
      },
    ],
    [
      JobType.ERPSyncHolidayList,
      'holiday_lists',
      {
        id: VALID_ENTITY_ID,
        holiday_list_name: 'Ontario 2026',
        from_date: '2026-01-01',
        to_date: '2026-12-31',
        company: 'MDM Group Inc.',
        holidays: [],
      },
    ],
    [
      JobType.ERPSyncDepartment,
      'divisions',
      {
        id: VALID_ENTITY_ID,
        name: 'MDM Contracting',
        company: 'MDM Group Inc.',
        parent_department: null,
        is_group: false,
      },
    ],
    [
      JobType.ERPSyncCompany,
      'organizations',
      {
        id: VALID_ENTITY_ID,
        name: 'MDM Group Inc.',
        abbreviation: 'MDM',
        default_currency: 'CAD',
        country: 'Canada',
      },
    ],
  ];

  it.each(hrJobs)(
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

  it('processes ERPSyncHrSettings (no entity table lookup)', async () => {
    const client = mockSupabaseClient({
      tables: {
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

    const job = makeJob(JobType.ERPSyncHrSettings);
    await expect(processJob(job)).resolves.not.toThrow();
  });

  it.each(hrJobs)(
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
      await expect(processJob(job)).rejects.toThrow('not found');
    },
  );

  describe('JobType enum values', () => {
    it('has all HR/Organization chain job types', () => {
      expect(JobType.ERPSyncEmployee).toBe('erp-sync-employee');
      expect(JobType.ERPSyncAttendance).toBe('erp-sync-attendance');
      expect(JobType.ERPSyncLeaveApplication).toBe('erp-sync-leave-application');
      expect(JobType.ERPSyncHolidayList).toBe('erp-sync-holiday-list');
      expect(JobType.ERPSyncDepartment).toBe('erp-sync-department');
      expect(JobType.ERPSyncHrSettings).toBe('erp-sync-hr-settings');
      expect(JobType.ERPSyncCompany).toBe('erp-sync-company');
    });
  });
});
