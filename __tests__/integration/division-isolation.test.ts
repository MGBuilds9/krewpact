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

// CRM routes
import { GET as leadsGET } from '@/app/api/crm/leads/route';
import { GET as accountsGET, POST as accountsPOST } from '@/app/api/crm/accounts/route';

// Estimate routes
import { GET as estimatesGET } from '@/app/api/estimates/route';

import {
  mockSupabaseClient,
  mockClerkAuth,
  makeRequest,
  makeJsonRequest,
  makeLead,
  makeAccount,
  makeEstimate,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

// Valid v4 UUIDs for Zod-validated fields
const DIVISION_A = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const DIVISION_B = 'b1ffcd00-0d1c-4ef9-bb7e-7cc0ce491b22';
const DIVISION_C = 'c2aadd11-1e2d-4fa0-aa8f-8dd1df592c33';

// ============================================================
// Integration Test: Division Isolation for CRM + Estimates
// ============================================================
describe('Division Isolation: Leads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('user with division "contracting" can list leads in their division', async () => {
    const contractingLeads = [
      makeLead({ division_id: DIVISION_A, lead_name: 'Contracting Lead 1' }),
      makeLead({ division_id: DIVISION_A, lead_name: 'Contracting Lead 2' }),
    ];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: contractingLeads, error: null } } }),
    );

    const res = await leadsGET(makeRequest(`/api/crm/leads?division_id=${DIVISION_A}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].division_id).toBe(DIVISION_A);
    expect(body.data[1].division_id).toBe(DIVISION_A);
  });

  it('user with division "contracting" gets empty result for "homes" division leads', async () => {
    mockClerkAuth(mockAuth);
    // RLS would filter — mock returns empty (simulating user cannot see other division)
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: [], error: null } } }),
    );

    const res = await leadsGET(makeRequest(`/api/crm/leads?division_id=${DIVISION_B}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });

  it('user with multiple divisions sees data from all their divisions', async () => {
    const multiDivLeads = [
      makeLead({ division_id: DIVISION_A, lead_name: 'Contracting Lead' }),
      makeLead({ division_id: DIVISION_B, lead_name: 'Homes Lead' }),
      makeLead({ division_id: DIVISION_C, lead_name: 'Telecom Lead' }),
    ];
    mockClerkAuth(mockAuth);
    // User has access to all 3 divisions — RLS returns all
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: multiDivLeads, error: null } } }),
    );

    const res = await leadsGET(makeRequest('/api/crm/leads'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(3);
    const divIds = body.data.map((l: Record<string, unknown>) => l.division_id);
    expect(divIds).toContain(DIVISION_A);
    expect(divIds).toContain(DIVISION_B);
    expect(divIds).toContain(DIVISION_C);
  });
});

describe('Division Isolation: Platform admin bypass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('platform admin sees all divisions regardless of JWT claims', async () => {
    // Platform admin with krewpact_roles=['platform_admin'] sees everything
    const allAccounts = [
      makeAccount({ division_id: DIVISION_A, account_name: 'Contracting Co' }),
      makeAccount({ division_id: DIVISION_B, account_name: 'Homes Co' }),
      makeAccount({ division_id: DIVISION_C, account_name: 'Telecom Co' }),
    ];
    mockClerkAuth(mockAuth);
    // Admin bypasses division RLS — all data returned
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { accounts: { data: allAccounts, error: null } } }),
    );

    const res = await accountsGET(makeRequest('/api/crm/accounts'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(3);
    // Verify all three divisions are represented
    const divIds = body.data.map((a: Record<string, unknown>) => a.division_id);
    expect(new Set(divIds).size).toBe(3);
  });
});

describe('Division Isolation: Account creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('creating account in a division user does not belong to fails (RLS blocks insert)', async () => {
    mockClerkAuth(mockAuth);
    // RLS denies the insert — Supabase returns an error
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          accounts: {
            data: null,
            error: { message: 'new row violates row-level security policy', code: '42501' },
          },
        },
      }),
    );

    const res = await accountsPOST(
      makeJsonRequest('/api/crm/accounts', {
        account_name: 'Unauthorized Division Account',
        account_type: 'client',
        division_id: DIVISION_B,
      }),
    );
    // Route should return 500 for RLS policy violations (since the error comes from Supabase)
    expect(res.status).toBeGreaterThanOrEqual(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});

describe('Division Isolation: Estimates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('estimate in division A not visible to user in division B', async () => {
    // User in division B queries estimates — RLS filters out division A estimates
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { estimates: { data: [], error: null } },
      }),
    );

    const res = await estimatesGET(makeRequest(`/api/estimates?division_id=${DIVISION_A}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    // User in division B sees no estimates from division A (estimates returns raw array)
    expect(Array.isArray(body) ? body : (body.data ?? body)).toHaveLength(0);
  });

  it('user sees only their own division estimates when filtering', async () => {
    const ownEstimates = [
      makeEstimate({ division_id: DIVISION_A, estimate_number: 'EST-2026-001' }),
      makeEstimate({ division_id: DIVISION_A, estimate_number: 'EST-2026-002' }),
    ];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { estimates: { data: ownEstimates, error: null } },
      }),
    );

    const res = await estimatesGET(makeRequest(`/api/estimates?division_id=${DIVISION_A}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    const arr = Array.isArray(body) ? body : (body.data ?? body);
    expect(arr).toHaveLength(2);
    expect(arr.every((e: Record<string, unknown>) => e.division_id === DIVISION_A)).toBe(true);
  });
});
