import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  makeEstimate,
  makeEstimateLine,
  resetFixtureCounter,
  TEST_IDS,
} from './index';

describe('mockSupabaseClient', () => {
  it('returns default empty data for select chain', async () => {
    const client = mockSupabaseClient();
    const result = await client.from('accounts').select('*');
    expect(result).toEqual({ data: [], error: null });
  });

  it('supports configurable default response', async () => {
    const accounts = [{ id: '1', account_name: 'Test' }];
    const client = mockSupabaseClient({
      defaultResponse: { data: accounts, error: null },
    });
    const result = await client.from('accounts').select('*');
    expect(result).toEqual({ data: accounts, error: null });
  });

  it('supports per-table responses', async () => {
    const accounts = [{ id: '1', account_name: 'Acme' }];
    const leads = [{ id: '2', lead_name: 'Big Lead' }];
    const client = mockSupabaseClient({
      tables: {
        accounts: { data: accounts, error: null },
        leads: { data: leads, error: null },
      },
    });

    const accResult = await client.from('accounts').select('*');
    expect(accResult.data).toEqual(accounts);

    const leadResult = await client.from('leads').select('*');
    expect(leadResult.data).toEqual(leads);
  });

  it('supports chained .eq().order().limit()', async () => {
    const data = [{ id: '1' }];
    const client = mockSupabaseClient({
      defaultResponse: { data, error: null },
    });
    const result = await client
      .from('accounts')
      .select('*')
      .eq('division_id', 'abc')
      .order('created_at', { ascending: false })
      .limit(10);
    expect(result).toEqual({ data, error: null });
  });

  it('supports .insert().select().single() chain', async () => {
    const created = { id: '1', account_name: 'New' };
    const client = mockSupabaseClient({
      defaultResponse: { data: created, error: null },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const from = client.from('accounts') as any;
    const result = await from.insert({ account_name: 'New' }).select().single();
    expect(result).toEqual({ data: created, error: null });
  });

  it('supports .update().eq().select().single() chain', async () => {
    const updated = { id: '1', account_name: 'Updated' };
    const client = mockSupabaseClient({
      defaultResponse: { data: updated, error: null },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const from = client.from('accounts') as any;
    const result = await from.update({ account_name: 'Updated' }).eq('id', '1').select().single();
    expect(result).toEqual({ data: updated, error: null });
  });

  it('supports .delete().eq() chain', async () => {
    const client = mockSupabaseClient({
      defaultResponse: { data: null, error: null },
    });
    const result = await client.from('accounts').delete().eq('id', '1');
    expect(result).toEqual({ data: null, error: null });
  });

  it('supports error responses', async () => {
    const client = mockSupabaseClient({
      defaultResponse: {
        data: null,
        error: { message: 'Not found', code: 'PGRST116' },
      },
    });
    const result = await client.from('accounts').select('*').eq('id', 'bad');
    expect(result.error).toEqual({ message: 'Not found', code: 'PGRST116' });
  });

  it('supports .ilike() for search queries', async () => {
    const data = [{ id: '1', account_name: 'Acme' }];
    const client = mockSupabaseClient({
      defaultResponse: { data, error: null },
    });
    const result = await client.from('accounts').select('*').ilike('account_name', '%acme%');
    expect(result).toEqual({ data, error: null });
  });
});

describe('mockClerkAuth', () => {
  it('sets up authenticated mock that resolves with userId', async () => {
    const mockAuth = vi.fn();
    mockClerkAuth(mockAuth, 'user_123');
    // mockClerkAuth configures the mock's resolved value
    const result = await mockAuth();
    expect(result.userId).toBe('user_123');
    expect(result.sessionClaims.krewpact_user_id).toBe('user_123');
  });

  it('sets up unauthenticated mock via mockClerkUnauth', async () => {
    const mockAuth = vi.fn();
    mockClerkUnauth(mockAuth);
    const result = await mockAuth();
    expect(result.userId).toBeNull();
    expect(result.sessionClaims).toBeNull();
  });

  it('uses default userId when none provided', async () => {
    const mockAuth = vi.fn();
    mockClerkAuth(mockAuth);
    const result = await mockAuth();
    expect(result.userId).toBe('user_test_123');
  });
});

describe('makeRequest', () => {
  it('creates NextRequest with correct URL', () => {
    const req = makeRequest('/api/projects');
    expect(req.url).toBe('http://localhost:3000/api/projects');
  });

  it('creates NextRequest with query params', () => {
    const req = makeRequest('/api/projects?limit=10&offset=0');
    expect(req.nextUrl.searchParams.get('limit')).toBe('10');
    expect(req.nextUrl.searchParams.get('offset')).toBe('0');
  });
});

describe('makeJsonRequest', () => {
  it('creates NextRequest with JSON body', async () => {
    const req = makeJsonRequest('/api/accounts', {
      account_name: 'Test',
    });
    expect(req.method).toBe('POST');
    const body = await req.json();
    expect(body.account_name).toBe('Test');
  });

  it('supports custom method', async () => {
    const req = makeJsonRequest('/api/accounts/123', { account_name: 'Updated' }, 'PATCH');
    expect(req.method).toBe('PATCH');
  });
});

describe('fixtures', () => {
  beforeEach(() => {
    resetFixtureCounter();
  });

  it('makeAccount returns valid account shape', () => {
    const account = makeAccount();
    expect(account.id).toBeDefined();
    expect(account.account_name).toBe('Test Account Inc.');
    expect(account.account_type).toBe('client');
    expect(account.division_id).toBe(TEST_IDS.DIVISION_ID);
  });

  it('makeContact returns valid contact shape', () => {
    const contact = makeContact();
    expect(contact.first_name).toBe('Jane');
    expect(contact.last_name).toBe('Smith');
    expect(contact.email).toBe('jane.smith@example.com');
    expect(contact.account_id).toBe(TEST_IDS.ACCOUNT_ID);
  });

  it('makeLead returns valid lead shape', () => {
    const lead = makeLead();
    expect(lead.company_name).toBe('Big Construction Project');
    expect(lead.status).toBe('new');
    expect(lead.source_channel).toBe('website');
  });

  it('makeOpportunity returns valid opportunity shape', () => {
    const opp = makeOpportunity();
    expect(opp.opportunity_name).toBe('Renovation Phase 1');
    expect(opp.stage).toBe('intake');
    expect(opp.estimated_revenue).toBe(150000);
  });

  it('makeActivity returns valid activity shape', () => {
    const activity = makeActivity();
    expect(activity.activity_type).toBe('call');
    expect(activity.title).toBe('Follow-up call');
    expect(activity.opportunity_id).toBe(TEST_IDS.OPPORTUNITY_ID);
  });

  it('makeEstimate returns valid estimate shape', () => {
    const estimate = makeEstimate();
    expect(estimate.estimate_number).toBe('EST-2026-001');
    expect(estimate.status).toBe('draft');
    expect(estimate.currency_code).toBe('CAD');
  });

  it('makeEstimateLine returns valid line shape', () => {
    const line = makeEstimateLine();
    expect(line.description).toBe('Labour — Framing crew');
    expect(line.quantity).toBe(40);
    expect(line.unit_cost).toBe(75);
    expect(line.line_total).toBe(3300);
  });

  it('supports overrides', () => {
    const account = makeAccount({ account_name: 'Custom Co.' });
    expect(account.account_name).toBe('Custom Co.');
  });

  it('generates unique IDs across calls', () => {
    const a1 = makeAccount();
    const a2 = makeAccount();
    expect(a1.id).not.toBe(a2.id);
  });

  it('resetFixtureCounter resets IDs', () => {
    const a1 = makeAccount();
    resetFixtureCounter();
    const a2 = makeAccount();
    expect(a1.id).toBe(a2.id);
  });

  it('TEST_IDS contains well-known values', () => {
    expect(TEST_IDS.DIVISION_ID).toBeDefined();
    expect(TEST_IDS.USER_ID).toBeDefined();
    expect(TEST_IDS.ACCOUNT_ID).toBeDefined();
    expect(TEST_IDS.CONTACT_ID).toBeDefined();
    expect(TEST_IDS.LEAD_ID).toBeDefined();
    expect(TEST_IDS.OPPORTUNITY_ID).toBeDefined();
    expect(TEST_IDS.ESTIMATE_ID).toBeDefined();
  });
});
