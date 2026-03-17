/**
 * Tests for /api/projects/[id]/rfis (GET list, POST) and /api/projects/[id]/rfis/[rfiId] (GET, PATCH).
 *
 * Covers: auth, pagination, status filter, creation, detail, update, 404, validation.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { GET as GET_DETAIL, PATCH } from '@/app/api/projects/[id]/rfis/[rfiId]/route';
import { GET, POST } from '@/app/api/projects/[id]/rfis/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeProjectContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRfiContext(id: string, rfiId: string) {
  return { params: Promise.resolve({ id, rfiId }) };
}

const sampleRfi = {
  id: 'rfi-1',
  project_id: 'proj-1',
  rfi_number: 'RFI-001',
  title: 'Structural beam clarification',
  question_text: 'What gauge steel is specified for the main support beam?',
  status: 'open',
  requester_user_id: 'user_test_123',
  responder_user_id: null,
  due_at: '2026-03-15',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

/* ─── GET /api/projects/[id]/rfis ─── */
describe('GET /api/projects/[id]/rfis', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/projects/proj-1/rfis'), makeProjectContext('proj-1'));
    expect(res.status).toBe(401);
  });

  it('returns paginated RFI list', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { rfi_items: { data: [sampleRfi], error: null } } }),
      error: null,
    });

    const res = await GET(makeRequest('/api/projects/proj-1/rfis'), makeProjectContext('proj-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].rfi_number).toBe('RFI-001');
  });

  it('filters by status', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { rfi_items: { data: [], error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(
      makeRequest('/api/projects/proj-1/rfis?status=closed'),
      makeProjectContext('proj-1'),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('rfi_items');
  });
});

/* ─── POST /api/projects/[id]/rfis ─── */
describe('POST /api/projects/[id]/rfis', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/rfis', { title: 'Test' }),
      makeProjectContext('proj-1'),
    );
    expect(res.status).toBe(401);
  });

  it('creates an RFI with status open', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { rfi_items: { data: sampleRfi, error: null } } }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/rfis', {
        rfi_number: 'RFI-001',
        title: 'Structural beam clarification',
        question_text: 'What gauge steel is specified?',
      }),
      makeProjectContext('proj-1'),
    );
    expect(res.status).toBe(201);
  });

  it('returns 400 for missing required fields', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/rfis', { title: 'Missing fields' }),
      makeProjectContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeRequest('/api/projects/proj-1/rfis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }),
      makeProjectContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });
});

/* ─── GET /api/projects/[id]/rfis/[rfiId] ─── */
describe('GET /api/projects/[id]/rfis/[rfiId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_DETAIL(
      makeRequest('/api/projects/proj-1/rfis/rfi-1'),
      makeRfiContext('proj-1', 'rfi-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns RFI by id', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { rfi_items: { data: sampleRfi, error: null } } }),
      error: null,
    });

    const res = await GET_DETAIL(
      makeRequest('/api/projects/proj-1/rfis/rfi-1'),
      makeRfiContext('proj-1', 'rfi-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Structural beam clarification');
  });

  it('returns 404 when not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { rfi_items: { data: null, error: { message: 'Not found', code: 'PGRST116' } } },
      }),
      error: null,
    });

    const res = await GET_DETAIL(
      makeRequest('/api/projects/proj-1/rfis/missing'),
      makeRfiContext('proj-1', 'missing'),
    );
    expect(res.status).toBe(404);
  });
});

/* ─── PATCH /api/projects/[id]/rfis/[rfiId] ─── */
describe('PATCH /api/projects/[id]/rfis/[rfiId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/projects/proj-1/rfis/rfi-1', { status: 'closed' }, 'PATCH'),
      makeRfiContext('proj-1', 'rfi-1'),
    );
    expect(res.status).toBe(401);
  });

  it('updates RFI', async () => {
    mockClerkAuth(mockAuth);
    const updated = { ...sampleRfi, status: 'closed' };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { rfi_items: { data: updated, error: null } } }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest('/api/projects/proj-1/rfis/rfi-1', { status: 'closed' }, 'PATCH'),
      makeRfiContext('proj-1', 'rfi-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('closed');
  });

  it('returns 404 when not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { rfi_items: { data: null, error: { message: 'Not found', code: 'PGRST116' } } },
      }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest('/api/projects/proj-1/rfis/missing', { status: 'closed' }, 'PATCH'),
      makeRfiContext('proj-1', 'missing'),
    );
    expect(res.status).toBe(404);
  });
});
