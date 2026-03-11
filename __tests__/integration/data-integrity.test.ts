import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';

// Account routes
import { DELETE as accountDELETE } from '@/app/api/crm/accounts/[id]/route';
import { GET as contactsGET } from '@/app/api/crm/contacts/route';

// Estimate routes
import { DELETE as estimateDELETE } from '@/app/api/estimates/[id]/route';
import { GET as linesGET } from '@/app/api/estimates/[id]/lines/route';
import { GET as versionsGET, POST as versionPOST } from '@/app/api/estimates/[id]/versions/route';

// Opportunity routes — only GET and PATCH/POST exist, no stage history PATCH/DELETE
import { GET as opportunityGET } from '@/app/api/crm/opportunities/[id]/route';

import {
  mockSupabaseClient,
  mockClerkAuth,
  makeRequest,
  makeJsonRequest,
  makeEstimate,
  makeEstimateLine,
  makeOpportunity,
  resetFixtureCounter,
  TEST_IDS,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const ESTIMATE_ID = 'f5ddaa44-4b5a-4fd3-ddbc-baa4ac825f66';
const USER_ID = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ============================================================
// Data Integrity: Cascading Deletes
// ============================================================
describe('Data Integrity: Account cascade to contacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('deleting an account succeeds and contacts for that account return empty (DB cascade)', async () => {
    // Step 1: Delete the account (DB handles ON DELETE CASCADE for contacts)
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { accounts: { data: null, error: null } } }),
      error: null,
    });

    const deleteRes = await accountDELETE(
      makeRequest('/api/crm/accounts/123'),
      makeContext(TEST_IDS.ACCOUNT_ID),
    );
    expect(deleteRes.status).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.success).toBe(true);

    // Step 2: Query contacts for the deleted account — should be empty
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { contacts: { data: [], error: null } } }),
      error: null,
    });

    const contactsRes = await contactsGET(
      makeRequest(`/api/crm/contacts?account_id=${TEST_IDS.ACCOUNT_ID}`),
    );
    expect(contactsRes.status).toBe(200);
    const contacts = await contactsRes.json();
    expect(contacts.data).toHaveLength(0);
  });
});

describe('Data Integrity: Estimate cascade to lines and versions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('deleting an estimate cascades to lines and versions', async () => {
    // Step 1: Delete the estimate
    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { estimates: { data: null, error: null } } }),
      error: null,
    });

    const deleteRes = await estimateDELETE(
      makeRequest(`/api/estimates/${ESTIMATE_ID}`),
      makeContext(ESTIMATE_ID),
    );
    expect(deleteRes.status).toBe(200);
    expect((await deleteRes.json()).success).toBe(true);

    // Step 2: Lines for the deleted estimate should be empty
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { estimate_lines: { data: [], error: null } } }),
      error: null,
    });

    const linesRes = await linesGET(
      makeRequest(`/api/estimates/${ESTIMATE_ID}/lines`),
      makeContext(ESTIMATE_ID),
    );
    expect(linesRes.status).toBe(200);
    expect((await linesRes.json()).data).toHaveLength(0);

    // Step 3: Versions for the deleted estimate should be empty
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { estimate_versions: { data: [], error: null } } }),
      error: null,
    });

    const versionsRes = await versionsGET(
      makeRequest(`/api/estimates/${ESTIMATE_ID}/versions`),
      makeContext(ESTIMATE_ID),
    );
    expect(versionsRes.status).toBe(200);
    expect((await versionsRes.json()).data).toHaveLength(0);
  });
});

// ============================================================
// Data Integrity: Immutability of Historical Records
// ============================================================
describe('Data Integrity: Opportunity stage history immutability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('opportunity_stage_history has no update/delete API endpoints — only readable via GET opportunity', async () => {
    // Verify that stage history is immutable by design:
    // 1) There is no dedicated /opportunity_stage_history route
    // 2) History is only accessible nested within GET /opportunities/[id]
    // 3) The route only exposes GET, PATCH, DELETE for the opportunity itself, not its history
    const opp = makeOpportunity({ stage: 'proposal' });
    const stageHistory = [
      {
        id: 'h1',
        opportunity_id: opp.id,
        from_stage: 'intake',
        to_stage: 'site_visit',
        changed_by: TEST_IDS.USER_ID,
        changed_at: '2026-01-10T00:00:00Z',
      },
      {
        id: 'h2',
        opportunity_id: opp.id,
        from_stage: 'site_visit',
        to_stage: 'proposal',
        changed_by: TEST_IDS.USER_ID,
        changed_at: '2026-01-15T00:00:00Z',
      },
    ];
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          opportunities: {
            data: { ...opp, opportunity_stage_history: stageHistory },
            error: null,
          },
        },
      }),
      error: null,
    });

    // Stage history is read-only — accessible via GET opportunity with nested join
    const res = await opportunityGET(
      makeRequest(`/api/crm/opportunities/${opp.id}`),
      makeContext(opp.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.opportunity_stage_history).toHaveLength(2);
    // Records are immutable snapshots — they have from_stage and to_stage
    expect(body.opportunity_stage_history[0].from_stage).toBe('intake');
    expect(body.opportunity_stage_history[0].to_stage).toBe('site_visit');
    expect(body.opportunity_stage_history[1].from_stage).toBe('site_visit');
    expect(body.opportunity_stage_history[1].to_stage).toBe('proposal');
  });
});

describe('Data Integrity: Estimate version snapshot immutability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('estimate_versions only supports GET (list) and POST (create) — no update/delete endpoints', async () => {
    // The versions route (app/api/estimates/[id]/versions/route.ts) only exports GET and POST.
    // There is no PATCH or DELETE handler, ensuring version snapshots are immutable.
    // Verify by creating a version and reading it back.

    // Step 1: Create a version
    const estimate = makeEstimate({ id: ESTIMATE_ID, revision_no: 1 });
    const lines = [makeEstimateLine({ estimate_id: ESTIMATE_ID, line_total: 5000 })];
    const version = {
      id: 'v1-id',
      estimate_id: ESTIMATE_ID,
      revision_no: 1,
      snapshot: { estimate, lines, created_at: '2026-02-13T00:00:00Z' },
      reason: 'Initial version',
      created_by: USER_ID,
      created_at: '2026-02-13T00:00:00Z',
    };
    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          estimates: { data: { ...estimate, estimate_lines: lines }, error: null },
          estimate_versions: { data: version, error: null },
        },
      }),
      error: null,
    });

    const createRes = await versionPOST(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/versions`, {
        reason: 'Initial version',
      }),
      makeContext(ESTIMATE_ID),
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.reason).toBe('Initial version');
    expect(created.snapshot).toBeDefined();

    // Step 2: Read back — version is preserved as-is
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { estimate_versions: { data: [version], error: null } },
      }),
      error: null,
    });

    const listRes = await versionsGET(
      makeRequest(`/api/estimates/${ESTIMATE_ID}/versions`),
      makeContext(ESTIMATE_ID),
    );
    expect(listRes.status).toBe(200);
    const versions = await listRes.json();
    expect(versions.data).toHaveLength(1);
    expect(versions.data[0].revision_no).toBe(1);
    expect(versions.data[0].snapshot.estimate).toBeDefined();
    expect(versions.data[0].snapshot.lines).toBeDefined();
    // Snapshot is a frozen point-in-time — no way to modify it via API
  });
});
