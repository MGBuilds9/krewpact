import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuth, mockGetRoles, mockCreateScopedServiceClient } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetRoles: vi.fn(),
  mockCreateScopedServiceClient: vi.fn(),
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

import { makeRequest } from '@/__tests__/helpers';
import { mockSupabaseClient } from '@/__tests__/helpers/mock-supabase';
import { GET as GET_JOB } from '@/app/api/erp/sync/[jobId]/route';

const VALID_ENTITY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_JOB_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

function makeContext(jobId: string) {
  return { params: Promise.resolve({ jobId }) };
}

describe('GET /api/erp/sync/[jobId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_123' });
    mockGetRoles.mockResolvedValue(['platform_admin']);
  });

  it('returns 401 without auth', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const res = await GET_JOB(
      makeRequest(`/api/erp/sync/${VALID_JOB_ID}`),
      makeContext(VALID_JOB_ID),
    );

    expect(res.status).toBe(401);
  });

  it('returns 403 without required role', async () => {
    mockGetRoles.mockResolvedValue(['project_manager']);

    const res = await GET_JOB(
      makeRequest(`/api/erp/sync/${VALID_JOB_ID}`),
      makeContext(VALID_JOB_ID),
    );

    expect(res.status).toBe(403);
  });

  it('returns normalized running status and ERP docname', async () => {
    mockCreateScopedServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          erp_sync_jobs: {
            data: {
              id: VALID_JOB_ID,
              entity_type: 'account',
              entity_id: VALID_ENTITY_ID,
              status: 'processing',
              sync_direction: 'outbound',
              attempt_count: 2,
              max_attempts: 3,
            },
            error: null,
          },
          erp_sync_map: {
            data: {
              erp_docname: 'CUST-001',
            },
            error: null,
          },
        },
      }),
    );

    const res = await GET_JOB(
      makeRequest(`/api/erp/sync/${VALID_JOB_ID}`),
      makeContext(VALID_JOB_ID),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        id: VALID_JOB_ID,
        status: 'running',
        db_status: 'processing',
        erp_docname: 'CUST-001',
      }),
    );
  });

  it('returns 404 when job does not exist', async () => {
    mockCreateScopedServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          erp_sync_jobs: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        },
      }),
    );

    const res = await GET_JOB(
      makeRequest(`/api/erp/sync/${VALID_JOB_ID}`),
      makeContext(VALID_JOB_ID),
    );

    expect(res.status).toBe(404);
  });
});
