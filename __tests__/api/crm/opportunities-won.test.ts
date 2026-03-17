import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
  createServiceClient: vi.fn(),
}));

// Mock SyncService
vi.mock('@/lib/erp/sync-service', () => {
  return {
    SyncService: class MockSyncService {
      async syncWonDeal() {
        return {
          id: 'job-1',
          status: 'succeeded',
          entity_type: 'sales_order',
          entity_id: 'opp-1',
          erp_docname: 'SO-MOCK-001',
          attempt_count: 1,
        };
      }
    },
  };
});

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeOpportunity,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  resetFixtureCounter,
} from '@/__tests__/helpers';
import { POST } from '@/app/api/crm/opportunities/[id]/won/route';
import { createServiceClient, createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockCreateServiceClient = vi.mocked(createServiceClient);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/crm/opportunities/[id]/won', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    // Default service client mock — account/lead lookups return empty, inserts succeed
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        defaultResponse: { data: null, error: null },
      }) as ReturnType<typeof createServiceClient>,
    );
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/won', {}),
      makeContext('some-id'),
    );
    expect(res.status).toBe(401);
  });

  it('marks a contracted opportunity as won', async () => {
    const opp = makeOpportunity({ stage: 'contracted' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          opportunities: { data: opp, error: null },
          activities: { data: { id: 'act-1' }, error: null },
        },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/won', {
        won_date: '2026-03-01',
        won_notes: 'Great win!',
      }),
      makeContext(opp.id),
    );
    expect(res.status).toBe(200);
  });

  it('rejects non-contracted opportunity', async () => {
    const opp = makeOpportunity({ stage: 'proposal' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { opportunities: { data: opp, error: null } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/won', {}),
      makeContext(opp.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('contracted');
  });

  it('syncs to ERPNext when sync_to_erp is true', async () => {
    const opp = makeOpportunity({ stage: 'contracted' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          opportunities: { data: opp, error: null },
          activities: { data: { id: 'act-1' }, error: null },
        },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/won', {
        sync_to_erp: true,
      }),
      makeContext(opp.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sync_result).toBeDefined();
    expect(body.sync_result.status).toBe('succeeded');
  });

  it('returns 404 for non-existent opportunity', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          opportunities: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/won', {}),
      makeContext('nonexistent'),
    );
    expect(res.status).toBe(404);
  });
});
