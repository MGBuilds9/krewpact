import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';

// Account routes
import { GET as accountsGET, POST as accountsPOST } from '@/app/api/crm/accounts/route';
import { DELETE as accountDELETE } from '@/app/api/crm/accounts/[id]/route';

// Contact routes
import { GET as contactsGET, POST as contactsPOST } from '@/app/api/crm/contacts/route';

// Lead routes
import { GET as leadsGET, POST as leadsPOST } from '@/app/api/crm/leads/route';
import { POST as leadStagePOST } from '@/app/api/crm/leads/[id]/stage/route';

// Opportunity routes
import {
  GET as opportunitiesGET,
  POST as opportunitiesPOST,
} from '@/app/api/crm/opportunities/route';
import {
  GET as opportunityGET,
  PATCH as opportunityPATCH,
} from '@/app/api/crm/opportunities/[id]/route';

// Activity routes
import { POST as activitiesPOST } from '@/app/api/crm/activities/route';

import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  makeAccount,
  makeContact,
  makeLead,
  makeOpportunity,
  makeActivity,
  resetFixtureCounter,
  TEST_IDS,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

// Valid v4 UUIDs for use in Zod-validated fields (TEST_IDS use 00000000-... which fails strict UUID validation)
const VALID_DIVISION_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_ACCOUNT_ID = 'b1ffcd00-0d1c-4ef9-bb7e-7cc0ce491b22';
const VALID_LEAD_ID = 'c2aadd11-1e2d-4fa0-aa8f-8dd1df592c33';
const VALID_OPPORTUNITY_ID = 'd3bbee22-2f3e-4fb1-bb9a-9ee2ea603d44';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ============================================================
// Integration Test: Full CRM Happy Path
// ============================================================
describe('CRM Integration: Full happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('creates account → adds contact → creates lead → transitions stages → creates opportunity → logs activity → verifies pipeline', async () => {
    // Step 1: Create an account
    const account = makeAccount({ account_name: 'MDM Contracting Ltd.' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { accounts: { data: account, error: null } } }),
    );

    const accountRes = await accountsPOST(
      makeJsonRequest('/api/crm/accounts', {
        account_name: 'MDM Contracting Ltd.',
        account_type: 'client',
        division_id: VALID_DIVISION_ID,
      }),
    );
    expect(accountRes.status).toBe(201);
    const accountData = await accountRes.json();
    expect(accountData.account_name).toBe('MDM Contracting Ltd.');

    // Step 2: Add a primary contact to the account
    const contact = makeContact({
      account_id: account.id,
      first_name: 'Michael',
      last_name: 'Guirguis',
      is_primary: true,
    });
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { contacts: { data: contact, error: null } } }),
    );

    const contactRes = await contactsPOST(
      makeJsonRequest('/api/crm/contacts', {
        first_name: 'Michael',
        last_name: 'Guirguis',
        account_id: VALID_ACCOUNT_ID,
        is_primary: true,
      }),
    );
    expect(contactRes.status).toBe(201);
    const contactData = await contactRes.json();
    expect(contactData.is_primary).toBe(true);

    // Step 3: Create a lead with division
    const lead = makeLead({
      division_id: TEST_IDS.DIVISION_ID,
      company_name: 'Office Renovation - 100 Bay St',
      status: 'new',
    });
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: lead, error: null } } }),
    );

    const leadRes = await leadsPOST(
      makeJsonRequest('/api/crm/leads', {
        company_name: 'Office Renovation - 100 Bay St',
        division_id: VALID_DIVISION_ID,
      }),
    );
    expect(leadRes.status).toBe(201);

    // Step 4: Transition lead new → qualified
    // Mock returns lead at current stage 'new' (route fetches current then updates)
    const newLead = makeLead({ status: 'new' });
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: newLead, error: null } } }),
    );

    const transitionRes1 = await leadStagePOST(
      makeJsonRequest('/api/crm/leads/stage', { stage: 'qualified' }),
      makeContext(lead.id),
    );
    expect(transitionRes1.status).toBe(200);

    // Step 5: Transition lead qualified → estimating
    // Mock returns lead at current stage 'qualified'
    const qualifiedLead = makeLead({ status: 'qualified' });
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: qualifiedLead, error: null } } }),
    );

    const transitionRes2 = await leadStagePOST(
      makeJsonRequest('/api/crm/leads/stage', { stage: 'estimating' }),
      makeContext(lead.id),
    );
    expect(transitionRes2.status).toBe(200);

    // Step 6: Create opportunity linked to lead + account
    const opportunity = makeOpportunity({
      lead_id: lead.id,
      account_id: account.id,
      opportunity_name: 'Office Renovation Opportunity',
      stage: 'estimating',
      estimated_revenue: 250000,
    });
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { opportunities: { data: opportunity, error: null } } }),
    );

    const oppRes = await opportunitiesPOST(
      makeJsonRequest('/api/crm/opportunities', {
        opportunity_name: 'Office Renovation Opportunity',
        lead_id: VALID_LEAD_ID,
        account_id: VALID_ACCOUNT_ID,
        estimated_revenue: 250000,
      }),
    );
    expect(oppRes.status).toBe(201);

    // Step 7: Log a call activity on the opportunity
    const activity = makeActivity({
      opportunity_id: opportunity.id,
      activity_type: 'call',
      title: 'Initial scope discussion',
    });
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { activities: { data: activity, error: null } } }),
    );

    const activityRes = await activitiesPOST(
      makeJsonRequest('/api/crm/activities', {
        activity_type: 'call',
        title: 'Initial scope discussion',
        opportunity_id: VALID_OPPORTUNITY_ID,
      }),
    );
    expect(activityRes.status).toBe(201);

    // Step 8: Verify pipeline shows opportunity in correct stage
    const pipelineData = [makeOpportunity({ stage: 'estimating', estimated_revenue: 250000 })];
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { opportunities: { data: pipelineData, error: null } } }),
    );

    const pipelineRes = await opportunitiesGET(makeRequest('/api/crm/opportunities?view=pipeline'));
    expect(pipelineRes.status).toBe(200);
    const pipeline = await pipelineRes.json();
    expect(pipeline.stages).toBeDefined();
    expect(pipeline.stages.estimating).toBeDefined();
    expect(pipeline.stages.estimating.count).toBe(1);
    expect(pipeline.stages.estimating.total_value).toBe(250000);
  });
});

// ============================================================
// Integration Test: Division Isolation
// ============================================================
describe('CRM Integration: Division isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('user with division A only sees leads in division A', async () => {
    const divALeads = [makeLead({ division_id: VALID_DIVISION_ID, company_name: 'Div A Lead' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: divALeads, error: null } } }),
    );

    const res = await leadsGET(makeRequest(`/api/crm/leads?division_id=${VALID_DIVISION_ID}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].company_name).toBe('Div A Lead');
  });

  it('user with division A gets empty result for division B leads', async () => {
    const divBId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';
    mockClerkAuth(mockAuth);
    // RLS would filter, mock returns empty array (simulating division B has no accessible data)
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: [], error: null } } }),
    );

    const res = await leadsGET(makeRequest(`/api/crm/leads?division_id=${divBId}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });
});

// ============================================================
// Integration Test: Validation Chain
// ============================================================
describe('CRM Integration: Validation chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    mockClerkAuth(mockAuth);
  });

  it('POST account with empty name returns 400', async () => {
    const res = await accountsPOST(
      makeJsonRequest('/api/crm/accounts', {
        account_name: '',
        account_type: 'client',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST contact with invalid email returns 400', async () => {
    const res = await contactsPOST(
      makeJsonRequest('/api/crm/contacts', {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'not-an-email',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST lead transition new→won (skip) returns 400', async () => {
    const currentLead = makeLead({ status: 'new' });
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: currentLead, error: null } } }),
    );

    const res = await leadStagePOST(
      makeJsonRequest('/api/crm/leads/stage', { stage: 'won' }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(400);
  });

  it('POST activity with no entity returns 400', async () => {
    const res = await activitiesPOST(
      makeJsonRequest('/api/crm/activities', {
        activity_type: 'call',
        title: 'Orphan activity',
      }),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// Integration Test: Pipeline Aggregation
// ============================================================
describe('CRM Integration: Pipeline aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('pipeline groups 3 opportunities in different stages with correct counts and totals', async () => {
    const opportunities = [
      makeOpportunity({ stage: 'intake', estimated_revenue: 100000 }),
      makeOpportunity({ stage: 'estimating', estimated_revenue: 200000 }),
      makeOpportunity({ stage: 'proposal', estimated_revenue: 300000 }),
    ];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { opportunities: { data: opportunities, error: null } } }),
    );

    const res = await opportunitiesGET(makeRequest('/api/crm/opportunities?view=pipeline'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stages.intake.count).toBe(1);
    expect(body.stages.intake.total_value).toBe(100000);
    expect(body.stages.estimating.count).toBe(1);
    expect(body.stages.estimating.total_value).toBe(200000);
    expect(body.stages.proposal.count).toBe(1);
    expect(body.stages.proposal.total_value).toBe(300000);
  });

  it('pipeline with multiple opportunities in same stage sums revenue', async () => {
    const opportunities = [
      makeOpportunity({ stage: 'intake', estimated_revenue: 75000 }),
      makeOpportunity({ stage: 'intake', estimated_revenue: 125000 }),
      makeOpportunity({ stage: 'intake', estimated_revenue: 50000 }),
    ];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { opportunities: { data: opportunities, error: null } } }),
    );

    const res = await opportunitiesGET(makeRequest('/api/crm/opportunities?view=pipeline'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stages.intake.count).toBe(3);
    expect(body.stages.intake.total_value).toBe(250000);
  });
});

// ============================================================
// Integration Test: Stage History
// ============================================================
describe('CRM Integration: Stage history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('transitioning opportunity through 3 stages records full history', async () => {
    const opp = makeOpportunity({ stage: 'intake' });
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
        to_stage: 'estimating',
        changed_by: TEST_IDS.USER_ID,
        changed_at: '2026-01-15T00:00:00Z',
      },
      {
        id: 'h3',
        opportunity_id: opp.id,
        from_stage: 'estimating',
        to_stage: 'proposal',
        changed_by: TEST_IDS.USER_ID,
        changed_at: '2026-01-20T00:00:00Z',
      },
    ];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          opportunities: {
            data: {
              ...opp,
              stage: 'proposal',
              opportunity_stage_history: stageHistory,
            },
            error: null,
          },
        },
      }),
    );

    const res = await opportunityGET(
      makeRequest(`/api/crm/opportunities/${opp.id}`),
      makeContext(opp.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.opportunity_stage_history).toHaveLength(3);
    expect(body.opportunity_stage_history[0].from_stage).toBe('intake');
    expect(body.opportunity_stage_history[0].to_stage).toBe('site_visit');
    expect(body.opportunity_stage_history[2].from_stage).toBe('estimating');
    expect(body.opportunity_stage_history[2].to_stage).toBe('proposal');
  });

  it('PATCH opportunity stage change inserts history record', async () => {
    const opp = makeOpportunity({ stage: 'site_visit' });
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        opportunities: { data: opp, error: null },
        opportunity_stage_history: { data: { id: 'new-history' }, error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await opportunityPATCH(
      makeJsonRequest('/api/crm/opportunities/123', { stage: 'estimating' }, 'PATCH'),
      makeContext(opp.id),
    );
    expect(res.status).toBe(200);
    // Verify history table was called
    const fromCalls = (client.from as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[0],
    );
    expect(fromCalls).toContain('opportunity_stage_history');
  });
});

// ============================================================
// Integration Test: Search
// ============================================================
describe('CRM Integration: Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('search accounts returns matching results', async () => {
    const matchingAccounts = [makeAccount({ account_name: 'MDM Contracting' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { accounts: { data: matchingAccounts, error: null } } }),
    );

    const res = await accountsGET(makeRequest('/api/crm/accounts?search=MDM'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].account_name).toBe('MDM Contracting');
  });

  it('search with no matches returns empty array', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { accounts: { data: [], error: null } } }),
    );

    const res = await accountsGET(makeRequest('/api/crm/accounts?search=NonExistentCompany'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });
});

// ============================================================
// Integration Test: Cascading Delete
// ============================================================
describe('CRM Integration: Cascading behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('deleting account succeeds (DB handles cascade to contacts)', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { accounts: { data: null, error: null } } }),
    );

    const res = await accountDELETE(
      makeRequest('/api/crm/accounts/123'),
      makeContext(TEST_IDS.ACCOUNT_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('after deleting account, contacts for that account return empty (via mock simulating cascade)', async () => {
    mockClerkAuth(mockAuth);
    // Simulate that after account deletion, contacts list for that account is empty
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { contacts: { data: [], error: null } } }),
    );

    const res = await contactsGET(makeRequest(`/api/crm/contacts?account_id=${VALID_ACCOUNT_ID}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });
});

// ============================================================
// Integration Test: Auth Boundary (cross-cutting)
// ============================================================
describe('CRM Integration: Auth boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('unauthenticated requests to all CRM endpoints return 401', async () => {
    mockClerkUnauth(mockAuth);

    const results = await Promise.all([
      accountsGET(makeRequest('/api/crm/accounts')),
      leadsGET(makeRequest('/api/crm/leads')),
      opportunitiesGET(makeRequest('/api/crm/opportunities')),
      contactsGET(makeRequest('/api/crm/contacts')),
    ]);

    for (const res of results) {
      expect(res.status).toBe(401);
    }
  });
});

// ============================================================
// Integration Test: Lead Stage Progression (full path)
// ============================================================
describe('CRM Integration: Lead stage progression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('lead progresses through full lifecycle: new→qualified→estimating→proposal_sent→won', async () => {
    const stages = ['new', 'qualified', 'estimating', 'proposal_sent', 'won'] as const;

    for (let i = 0; i < stages.length - 1; i++) {
      const currentStage = stages[i];
      const nextStage = stages[i + 1];

      const currentLead = makeLead({ status: currentStage });
      mockClerkAuth(mockAuth);
      // Mock returns the lead at current stage for fetch, then updated for update
      mockCreateUserClient.mockResolvedValue(
        mockSupabaseClient({ tables: { leads: { data: currentLead, error: null } } }),
      );

      const res = await leadStagePOST(
        makeJsonRequest('/api/crm/leads/stage', { stage: nextStage }),
        makeContext(currentLead.id),
      );
      expect(res.status).toBe(200);
    }
  });

  it('lead can go to lost from any active stage with reason', async () => {
    const activeStages = ['new', 'qualified', 'estimating', 'proposal_sent'] as const;

    for (const stage of activeStages) {
      const currentLead = makeLead({ status: stage });
      mockClerkAuth(mockAuth);
      mockCreateUserClient.mockResolvedValue(
        mockSupabaseClient({ tables: { leads: { data: currentLead, error: null } } }),
      );

      const res = await leadStagePOST(
        makeJsonRequest('/api/crm/leads/stage', {
          stage: 'lost',
          lost_reason: 'Budget constraints',
        }),
        makeContext(currentLead.id),
      );
      expect(res.status).toBe(200);
    }
  });

  it('lost lead cannot transition to any other stage', async () => {
    const lostLead = makeLead({ status: 'lost', substatus: 'Budget constraints' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: lostLead, error: null } } }),
    );

    const res = await leadStagePOST(
      makeJsonRequest('/api/crm/leads/stage', { stage: 'qualified' }),
      makeContext(lostLead.id),
    );
    expect(res.status).toBe(400);
  });

  it('won lead cannot transition to any other stage', async () => {
    const wonLead = makeLead({ status: 'won' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: wonLead, error: null } } }),
    );

    const res = await leadStagePOST(
      makeJsonRequest('/api/crm/leads/stage', { stage: 'qualified' }),
      makeContext(wonLead.id),
    );
    expect(res.status).toBe(400);
  });
});
