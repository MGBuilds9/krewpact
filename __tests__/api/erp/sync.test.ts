import { beforeEach, describe, expect, it, vi } from 'vitest';

// Define mock methods at module level so they're accessible in tests
const mockSyncAccount = vi.fn();
const mockSyncEstimate = vi.fn();

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

// Mock ErpClient to disable mock mode
vi.mock('@/lib/erp/client', () => ({
  ErpClient: class MockErpClient {
    isMockMode() {
      return false;
    }
  },
}));

// Mock SyncService with a proper class
vi.mock('@/lib/erp/sync-service', () => ({
  SyncService: class MockSyncService {
    syncAccount = mockSyncAccount;
    syncEstimate = mockSyncEstimate;
  },
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  resetFixtureCounter,
} from '@/__tests__/helpers';
import { GET as GET_JOB } from '@/app/api/erp/sync/[jobId]/route';
import { POST } from '@/app/api/erp/sync/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const VALID_ENTITY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_JOB_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

function makeContext(jobId: string) {
  return { params: Promise.resolve({ jobId }) };
}

describe('POST /api/erp/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/erp/sync', { entity_type: 'account', entity_id: VALID_ENTITY_ID }),
    );
    expect(res.status).toBe(401);
  });

  it('triggers sync and returns job status', async () => {
    mockClerkAuth(mockAuth);

    const mockResult = {
      id: VALID_JOB_ID,
      status: 'succeeded',
      entity_type: 'account',
      entity_id: VALID_ENTITY_ID,
      erp_docname: 'CUST-MOCK-001',
      attempt_count: 1,
    };
    mockSyncAccount.mockResolvedValue(mockResult);

    const res = await POST(
      makeJsonRequest('/api/erp/sync', { entity_type: 'account', entity_id: VALID_ENTITY_ID }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('succeeded');
    expect(body.erp_docname).toBe('CUST-MOCK-001');
  });

  it('triggers estimate sync', async () => {
    mockClerkAuth(mockAuth);

    const mockResult = {
      id: VALID_JOB_ID,
      status: 'succeeded',
      entity_type: 'estimate',
      entity_id: VALID_ENTITY_ID,
      erp_docname: 'QTN-MOCK-001',
      attempt_count: 1,
    };
    mockSyncEstimate.mockResolvedValue(mockResult);

    const res = await POST(
      makeJsonRequest('/api/erp/sync', { entity_type: 'estimate', entity_id: VALID_ENTITY_ID }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entity_type).toBe('estimate');
  });

  it('returns 400 for invalid entity_type', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/erp/sync', { entity_type: 'invalid_type', entity_id: VALID_ENTITY_ID }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing entity_id', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(makeJsonRequest('/api/erp/sync', { entity_type: 'account' }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/erp/sync/[jobId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_JOB(
      makeRequest(`/api/erp/sync/${VALID_JOB_ID}`),
      makeContext(VALID_JOB_ID),
    );
    expect(res.status).toBe(401);
  });

  it('returns sync job status with erp_docname', async () => {
    mockClerkAuth(mockAuth);

    const job = {
      id: VALID_JOB_ID,
      entity_type: 'account',
      entity_id: VALID_ENTITY_ID,
      status: 'succeeded',
      sync_direction: 'outbound',
      attempt_count: 1,
    };
    const syncMap = {
      id: 'map-1',
      entity_type: 'account',
      local_id: VALID_ENTITY_ID,
      erp_docname: 'CUST-MOCK-001',
    };

    const client = mockSupabaseClient({
      tables: {
        erp_sync_jobs: { data: job, error: null },
        erp_sync_map: { data: syncMap, error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET_JOB(
      makeRequest(`/api/erp/sync/${VALID_JOB_ID}`),
      makeContext(VALID_JOB_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('succeeded');
    expect(body.erp_docname).toBe('CUST-MOCK-001');
  });

  it('returns 404 for non-existent job', async () => {
    mockClerkAuth(mockAuth);

    const client = mockSupabaseClient({
      tables: {
        erp_sync_jobs: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET_JOB(
      makeRequest(`/api/erp/sync/${VALID_JOB_ID}`),
      makeContext(VALID_JOB_ID),
    );
    expect(res.status).toBe(404);
  });
});
