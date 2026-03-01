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
import { GET as GET_PROPOSALS, POST as POST_PROPOSALS } from '@/app/api/proposals/route';
import {
  GET as GET_PROPOSAL_ID,
  PATCH as PATCH_PROPOSAL_ID,
} from '@/app/api/proposals/[id]/route';
import { GET as GET_CONTRACTS, POST as POST_CONTRACTS } from '@/app/api/contracts/route';
import { GET as GET_ESIGN, POST as POST_ESIGN } from '@/app/api/esign/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeProposal(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    estimate_id: VALID_UUID,
    proposal_number: 'PROP-00001',
    status: 'draft',
    proposal_payload: { sections: [] },
    expires_on: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeContract(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    proposal_id: VALID_UUID,
    legal_text_version: 'v1.0',
    contract_status: 'draft',
    terms_payload: { clauses: [] },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeEsignEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    id: VALID_UUID,
    contract_id: VALID_UUID,
    provider: 'boldsign',
    signer_count: 2,
    status: 'pending',
    provider_envelope_id: null,
    payload: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ============================================================
// GET /api/proposals
// ============================================================
describe('GET /api/proposals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_PROPOSALS(makeRequest('/api/proposals'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns paginated list of proposals', async () => {
    const proposals = [makeProposal(), makeProposal({ proposal_number: 'PROP-00002' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { proposals: { data: proposals, error: null } },
      }),
    );

    const res = await GET_PROPOSALS(makeRequest('/api/proposals'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('hasMore');
  });

  it('filters by estimate_id', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { proposals: { data: [makeProposal()], error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET_PROPOSALS(
      makeRequest(`/api/proposals?estimate_id=${VALID_UUID}`),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('proposals');
  });
});

// ============================================================
// POST /api/proposals
// ============================================================
describe('POST /api/proposals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_PROPOSALS(
      makeJsonRequest('/api/proposals', {
        estimate_id: VALID_UUID,
        proposal_payload: { sections: [] },
      }),
    );
    expect(res.status).toBe(401);
  });

  it('creates proposal with proposal_number and returns 201', async () => {
    const created = makeProposal();
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { proposals: { data: created, error: null } },
      }),
    );

    const res = await POST_PROPOSALS(
      makeJsonRequest('/api/proposals', {
        estimate_id: VALID_UUID,
        proposal_payload: { sections: [] },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('proposal_number');
  });

  it('returns 400 for missing estimate_id', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_PROPOSALS(
      makeJsonRequest('/api/proposals', { proposal_payload: { sections: [] } }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid UUID estimate_id', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_PROPOSALS(
      makeJsonRequest('/api/proposals', {
        estimate_id: 'not-a-uuid',
        proposal_payload: { sections: [] },
      }),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /api/proposals/[id]
// ============================================================
describe('GET /api/proposals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_PROPOSAL_ID(makeRequest('/api/proposals/123'), makeContext('123'));
    expect(res.status).toBe(401);
  });

  it('returns single proposal', async () => {
    const proposal = makeProposal();
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { proposals: { data: proposal, error: null } },
      }),
    );

    const res = await GET_PROPOSAL_ID(
      makeRequest(`/api/proposals/${VALID_UUID}`),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('draft');
  });

  it('returns 404 for non-existent proposal', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          proposals: {
            data: null,
            error: { message: 'Row not found', code: 'PGRST116' },
          },
        },
      }),
    );

    const res = await GET_PROPOSAL_ID(
      makeRequest('/api/proposals/nonexistent'),
      makeContext('nonexistent'),
    );
    expect(res.status).toBe(404);
  });
});

// ============================================================
// PATCH /api/proposals/[id]
// ============================================================
describe('PATCH /api/proposals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH_PROPOSAL_ID(
      makeJsonRequest('/api/proposals/123', { status: 'sent' }, 'PATCH'),
      makeContext('123'),
    );
    expect(res.status).toBe(401);
  });

  it('updates proposal status and returns updated record', async () => {
    const updated = makeProposal({ status: 'sent' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { proposals: { data: updated, error: null } },
      }),
    );

    const res = await PATCH_PROPOSAL_ID(
      makeJsonRequest('/api/proposals/123', { status: 'sent' }, 'PATCH'),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('sent');
  });

  it('returns 400 for invalid status value', async () => {
    mockClerkAuth(mockAuth);
    const res = await PATCH_PROPOSAL_ID(
      makeJsonRequest('/api/proposals/123', { status: 'invalid_status' }, 'PATCH'),
      makeContext(VALID_UUID),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /api/contracts
// ============================================================
describe('GET /api/contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_CONTRACTS(makeRequest('/api/contracts'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns paginated list of contracts', async () => {
    const contracts = [makeContract(), makeContract({ legal_text_version: 'v1.1' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { contract_terms: { data: contracts, error: null } },
      }),
    );

    const res = await GET_CONTRACTS(makeRequest('/api/contracts'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('hasMore');
  });

  it('filters by proposal_id', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { contract_terms: { data: [makeContract()], error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET_CONTRACTS(
      makeRequest(`/api/contracts?proposal_id=${VALID_UUID}`),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('contract_terms');
  });
});

// ============================================================
// POST /api/contracts
// ============================================================
describe('POST /api/contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_CONTRACTS(
      makeJsonRequest('/api/contracts', {
        proposal_id: VALID_UUID,
        legal_text_version: 'v1.0',
        terms_payload: { clauses: [] },
      }),
    );
    expect(res.status).toBe(401);
  });

  it('creates contract and returns 201', async () => {
    const created = makeContract();
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { contract_terms: { data: created, error: null } },
      }),
    );

    const res = await POST_CONTRACTS(
      makeJsonRequest('/api/contracts', {
        proposal_id: VALID_UUID,
        legal_text_version: 'v1.0',
        terms_payload: { clauses: [] },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.legal_text_version).toBe('v1.0');
  });

  it('returns 400 for missing proposal_id', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_CONTRACTS(
      makeJsonRequest('/api/contracts', {
        legal_text_version: 'v1.0',
        terms_payload: { clauses: [] },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing legal_text_version', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_CONTRACTS(
      makeJsonRequest('/api/contracts', {
        proposal_id: VALID_UUID,
        terms_payload: { clauses: [] },
      }),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /api/esign
// ============================================================
describe('GET /api/esign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_ESIGN(makeRequest('/api/esign'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns paginated list of esign envelopes', async () => {
    const envelopes = [makeEsignEnvelope(), makeEsignEnvelope({ signer_count: 3 })];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { esign_envelopes: { data: envelopes, error: null } },
      }),
    );

    const res = await GET_ESIGN(makeRequest('/api/esign'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('hasMore');
  });

  it('filters by contract_id', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { esign_envelopes: { data: [makeEsignEnvelope()], error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET_ESIGN(makeRequest(`/api/esign?contract_id=${VALID_UUID}`));
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('esign_envelopes');
  });
});

// ============================================================
// POST /api/esign
// ============================================================
describe('POST /api/esign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_ESIGN(
      makeJsonRequest('/api/esign', {
        contract_id: VALID_UUID,
        signer_count: 2,
      }),
    );
    expect(res.status).toBe(401);
  });

  it('creates esign envelope and returns 201', async () => {
    const created = makeEsignEnvelope();
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { esign_envelopes: { data: created, error: null } },
      }),
    );

    const res = await POST_ESIGN(
      makeJsonRequest('/api/esign', {
        contract_id: VALID_UUID,
        signer_count: 2,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.provider).toBe('boldsign');
    expect(body.signer_count).toBe(2);
  });

  it('returns 400 for missing contract_id', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_ESIGN(
      makeJsonRequest('/api/esign', { signer_count: 2 }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when signer_count is 0', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_ESIGN(
      makeJsonRequest('/api/esign', {
        contract_id: VALID_UUID,
        signer_count: 0,
      }),
    );
    expect(res.status).toBe(400);
  });
});
