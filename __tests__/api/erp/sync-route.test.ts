import { describe, it, expect, vi, beforeEach } from 'vitest';

// Define mock methods at module level so they're accessible in tests
const mockSyncAccount = vi.fn();
const mockSyncContact = vi.fn();
const mockSyncOpportunity = vi.fn();
const mockSyncEstimate = vi.fn();
const mockSyncWonDeal = vi.fn();
const mockSyncProject = vi.fn();
const mockSyncTask = vi.fn();
const mockSyncSupplier = vi.fn();
const mockSyncExpenseClaim = vi.fn();
const mockSyncTimesheet = vi.fn();

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
    syncContact = mockSyncContact;
    syncOpportunity = mockSyncOpportunity;
    syncEstimate = mockSyncEstimate;
    syncWonDeal = mockSyncWonDeal;
    syncProject = mockSyncProject;
    syncTask = mockSyncTask;
    syncSupplier = mockSyncSupplier;
    syncExpenseClaim = mockSyncExpenseClaim;
    syncTimesheet = mockSyncTimesheet;
  },
}));

import { auth } from '@clerk/nextjs/server';
import { POST } from '@/app/api/erp/sync/route';
import {
  mockClerkAuth,
  mockClerkUnauth,
  makeJsonRequest,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);

const VALID_ENTITY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_JOB_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

function makeSyncResult(entityType: string, docname: string) {
  return {
    id: VALID_JOB_ID,
    status: 'succeeded',
    entity_type: entityType,
    entity_id: VALID_ENTITY_ID,
    erp_docname: docname,
    attempt_count: 1,
  };
}

describe('POST /api/erp/sync — expanded entity types', () => {
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

  it('returns 400 for non-UUID entity_id', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/erp/sync', { entity_type: 'account', entity_id: 'not-a-uuid' }),
    );
    expect(res.status).toBe(400);
  });

  // Test each entity type dispatches to the correct sync method
  const entityTests: Array<{
    type: string;
    mockFn: () => ReturnType<typeof vi.fn>;
    docname: string;
  }> = [
    { type: 'account', mockFn: () => mockSyncAccount, docname: 'CUST-001' },
    { type: 'contact', mockFn: () => mockSyncContact, docname: 'CONT-001' },
    { type: 'opportunity', mockFn: () => mockSyncOpportunity, docname: 'OPP-001' },
    { type: 'estimate', mockFn: () => mockSyncEstimate, docname: 'QTN-001' },
    { type: 'contract', mockFn: () => mockSyncWonDeal, docname: 'SO-001' },
    { type: 'project', mockFn: () => mockSyncProject, docname: 'PROJ-001' },
    { type: 'task', mockFn: () => mockSyncTask, docname: 'TASK-001' },
    { type: 'supplier', mockFn: () => mockSyncSupplier, docname: 'SUPP-001' },
    { type: 'expense', mockFn: () => mockSyncExpenseClaim, docname: 'EXP-001' },
    { type: 'timesheet', mockFn: () => mockSyncTimesheet, docname: 'TS-001' },
  ];

  for (const { type, mockFn, docname } of entityTests) {
    it(`dispatches '${type}' to the correct sync method`, async () => {
      mockClerkAuth(mockAuth);
      const fn = mockFn();
      fn.mockResolvedValue(makeSyncResult(type, docname));

      const res = await POST(
        makeJsonRequest('/api/erp/sync', { entity_type: type, entity_id: VALID_ENTITY_ID }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('succeeded');
      expect(body.erp_docname).toBe(docname);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  }
});
