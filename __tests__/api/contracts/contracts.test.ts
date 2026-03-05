/**
 * Tests for /api/contracts (GET list, POST create) and /api/contracts/[id] (GET, PATCH).
 *
 * Covers: auth, pagination, filtering, creation, update, 404, validation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET, POST } from '@/app/api/contracts/route';
import { GET as GET_ID, PATCH } from '@/app/api/contracts/[id]/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const sampleContract = {
  id: 'ct-1',
  proposal_id: 'prop-1',
  contract_status: 'draft',
  contract_type: 'fixed_price',
  scope_description: 'Full kitchen renovation',
  total_value: 150000,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

/* ─── GET /api/contracts ─── */
describe('GET /api/contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/contracts'));
    expect(res.status).toBe(401);
  });

  it('returns paginated contract list', async () => {
    mockClerkAuth(mockAuth);
    const contracts = [sampleContract, { ...sampleContract, id: 'ct-2' }];
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { contract_terms: { data: contracts, error: null } } }),
    );

    const res = await GET(makeRequest('/api/contracts'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(typeof body.total).toBe('number');
    expect(typeof body.hasMore).toBe('boolean');
  });

  it('filters by proposal_id', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { contract_terms: { data: [sampleContract], error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(
      makeRequest('/api/contracts?proposal_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('contract_terms');
  });

  it('filters by contract_status', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { contract_terms: { data: [], error: null } } }),
    );

    const res = await GET(makeRequest('/api/contracts?contract_status=signed'));
    expect(res.status).toBe(200);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { contract_terms: { data: null, error: { message: 'DB down' } } },
      }),
    );

    const res = await GET(makeRequest('/api/contracts'));
    expect(res.status).toBe(500);
  });
});

/* ─── POST /api/contracts ─── */
describe('POST /api/contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(makeJsonRequest('/api/contracts', { scope_description: 'Test' }));
    expect(res.status).toBe(401);
  });

  it('creates a contract', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { contract_terms: { data: sampleContract, error: null } } }),
    );

    const res = await POST(
      makeJsonRequest('/api/contracts', {
        proposal_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        legal_text_version: 'v1.0',
        terms_payload: { scope: 'Full kitchen renovation', value: 150000 },
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('ct-1');
  });

  it('returns 400 for invalid JSON', async () => {
    mockClerkAuth(mockAuth);
    const req = makeRequest('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

/* ─── GET /api/contracts/[id] ─── */
describe('GET /api/contracts/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_ID(makeRequest('/api/contracts/ct-1'), makeContext('ct-1'));
    expect(res.status).toBe(401);
  });

  it('returns contract by id', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { contract_terms: { data: sampleContract, error: null } } }),
    );

    const res = await GET_ID(makeRequest('/api/contracts/ct-1'), makeContext('ct-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('ct-1');
    expect(body.scope_description).toBe('Full kitchen renovation');
  });

  it('returns 404 when not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { contract_terms: { data: null, error: { message: 'Not found', code: 'PGRST116' } } },
      }),
    );

    const res = await GET_ID(makeRequest('/api/contracts/missing'), makeContext('missing'));
    expect(res.status).toBe(404);
  });
});

/* ─── PATCH /api/contracts/[id] ─── */
describe('PATCH /api/contracts/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/contracts/ct-1', { contract_status: 'signed' }, 'PATCH'),
      makeContext('ct-1'),
    );
    expect(res.status).toBe(401);
  });

  it('updates contract fields', async () => {
    mockClerkAuth(mockAuth);
    const updated = { ...sampleContract, contract_status: 'signed' };
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { contract_terms: { data: updated, error: null } } }),
    );

    const res = await PATCH(
      makeJsonRequest('/api/contracts/ct-1', { contract_status: 'signed' }, 'PATCH'),
      makeContext('ct-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contract_status).toBe('signed');
  });

  it('returns 400 for invalid JSON', async () => {
    mockClerkAuth(mockAuth);
    const req = makeRequest('/api/contracts/ct-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await PATCH(req, makeContext('ct-1'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when contract not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { contract_terms: { data: null, error: { message: 'Not found', code: 'PGRST116' } } },
      }),
    );

    const res = await PATCH(
      makeJsonRequest('/api/contracts/missing', { contract_status: 'signed' }, 'PATCH'),
      makeContext('missing'),
    );
    expect(res.status).toBe(404);
  });
});
