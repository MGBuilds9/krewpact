/**
 * Tests for /api/compliance (GET + POST) and /api/compliance/[docId] (GET + PATCH).
 * Table: trade_partner_compliance_docs
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { GET as GET_LIST, POST } from '@/app/api/compliance/route';
import { GET as GET_DETAIL, PATCH } from '@/app/api/compliance/[docId]/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const DOC_ID = '00000000-0000-4000-a000-000000000901';

function docCtx(docId: string = DOC_ID) {
  return { params: Promise.resolve({ docId }) };
}

const sampleDoc = {
  id: DOC_ID,
  portal_account_id: '00000000-0000-4000-a000-000000000902',
  compliance_type: 'wsib',
  file_id: '00000000-0000-4000-a000-000000000903',
  doc_number: 'WSIB-2026-001',
  issued_on: '2026-01-01',
  expires_on: '2027-01-01',
  status: 'valid',
  verified_by: null,
  verified_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

/* --- LIST --- */
describe('GET /api/compliance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_LIST(makeRequest('/api/compliance'));
    expect(res.status).toBe(401);
  });

  it('returns compliance docs list', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { trade_partner_compliance_docs: { data: [sampleDoc], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET_LIST(makeRequest('/api/compliance'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].compliance_type).toBe('wsib');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          trade_partner_compliance_docs: { data: null, error: { message: 'err' }, count: null },
        },
      }),
      error: null,
    });
    const res = await GET_LIST(makeRequest('/api/compliance'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/compliance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(makeJsonRequest('/api/compliance', {}));
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(makeJsonRequest('/api/compliance', { bad: true }));
    expect(res.status).toBe(400);
  });

  it('returns 201 on valid creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { trade_partner_compliance_docs: { data: sampleDoc, error: null } },
      }),
      error: null,
    });
    const res = await POST(
      makeJsonRequest('/api/compliance', {
        portal_account_id: sampleDoc.portal_account_id,
        compliance_type: 'wsib',
        file_id: sampleDoc.file_id,
        doc_number: 'WSIB-2026-001',
        issued_on: '2026-01-01',
        expires_on: '2027-01-01',
      }),
    );
    expect(res.status).toBe(201);
  });
});

/* --- DETAIL --- */
describe('GET /api/compliance/[docId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_DETAIL(makeRequest('/api/compliance/x'), docCtx());
    expect(res.status).toBe(401);
  });

  it('returns compliance doc on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { trade_partner_compliance_docs: { data: sampleDoc, error: null } },
      }),
      error: null,
    });
    const res = await GET_DETAIL(makeRequest('/api/compliance/x'), docCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.doc_number).toBe('WSIB-2026-001');
  });

  it('returns 404 on not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { trade_partner_compliance_docs: { data: null, error: { message: 'not found' } } },
      }),
      error: null,
    });
    const res = await GET_DETAIL(makeRequest('/api/compliance/x'), docCtx());
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/compliance/[docId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/compliance/x', { status: 'expired' }, 'PATCH'),
      docCtx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns updated doc on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          trade_partner_compliance_docs: { data: { ...sampleDoc, status: 'expired' }, error: null },
        },
      }),
      error: null,
    });
    const res = await PATCH(
      makeJsonRequest('/api/compliance/x', { status: 'expired' }, 'PATCH'),
      docCtx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('expired');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { trade_partner_compliance_docs: { data: null, error: { message: 'err' } } },
      }),
      error: null,
    });
    const res = await PATCH(
      makeJsonRequest('/api/compliance/x', { status: 'expired' }, 'PATCH'),
      docCtx(),
    );
    expect(res.status).toBe(500);
  });
});
