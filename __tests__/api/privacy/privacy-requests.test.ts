/**
 * Tests for /api/privacy/requests (GET + POST),
 * /api/privacy/requests/[id] (GET + PATCH),
 * /api/privacy/requests/[id]/events (GET + POST).
 * Tables: privacy_requests, privacy_request_events
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
import { GET as GET_LIST, POST as POST_CREATE } from '@/app/api/privacy/requests/route';
import { GET as GET_DETAIL, PATCH } from '@/app/api/privacy/requests/[id]/route';
import {
  GET as GET_EVENTS,
  POST as POST_EVENT,
} from '@/app/api/privacy/requests/[id]/events/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const PR_ID = '00000000-0000-4000-a000-000000000801';

function idCtx(id: string = PR_ID) {
  return { params: Promise.resolve({ id }) };
}

const sampleRequest = {
  id: PR_ID,
  requester_email: 'test@example.com',
  requester_name: 'John Doe',
  request_type: 'access',
  status: 'received',
  legal_basis: 'consent',
  due_at: '2026-04-01T00:00:00Z',
  completed_at: null,
  handled_by: null,
  notes: null,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

const sampleEvent = {
  id: '00000000-0000-4000-a000-000000000802',
  privacy_request_id: PR_ID,
  event_type: 'status_changed',
  actor_user_id: '00000000-0000-4000-a000-000000000099',
  created_at: '2026-03-02T00:00:00Z',
};

/* --- LIST --- */
describe('GET /api/privacy/requests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_LIST(makeRequest('/api/privacy/requests'));
    expect(res.status).toBe(401);
  });

  it('returns privacy requests list', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { privacy_requests: { data: [sampleRequest], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET_LIST(makeRequest('/api/privacy/requests'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].request_type).toBe('access');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { privacy_requests: { data: null, error: { message: 'err' }, count: null } },
      }),
      error: null,
    });
    const res = await GET_LIST(makeRequest('/api/privacy/requests'));
    expect(res.status).toBe(500);
  });
});

/* --- CREATE --- */
describe('POST /api/privacy/requests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_CREATE(makeJsonRequest('/api/privacy/requests', {}));
    expect(res.status).toBe(401);
  });

  it('returns 201 on valid creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { privacy_requests: { data: sampleRequest, error: null } },
      }),
      error: null,
    });
    const res = await POST_CREATE(
      makeJsonRequest('/api/privacy/requests', {
        requester_email: 'test@example.com',
        requester_name: 'John Doe',
        request_type: 'access',
        legal_basis: 'consent',
        due_at: '2026-04-01T00:00:00Z',
      }),
    );
    expect(res.status).toBe(201);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { privacy_requests: { data: null, error: { message: 'insert err' } } },
      }),
      error: null,
    });
    const res = await POST_CREATE(
      makeJsonRequest('/api/privacy/requests', {
        requester_email: 'test@example.com',
        requester_name: 'John Doe',
        request_type: 'access',
        legal_basis: 'consent',
        due_at: '2026-04-01T00:00:00Z',
      }),
    );
    expect(res.status).toBe(500);
  });
});

/* --- DETAIL GET --- */
describe('GET /api/privacy/requests/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_DETAIL(makeRequest('/api/privacy/requests/x'), idCtx());
    expect(res.status).toBe(401);
  });

  it('returns privacy request on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { privacy_requests: { data: sampleRequest, error: null } },
      }),
      error: null,
    });
    const res = await GET_DETAIL(makeRequest('/api/privacy/requests/x'), idCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requester_email).toBe('test@example.com');
  });

  it('returns 404 on not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { privacy_requests: { data: null, error: { message: 'not found' } } },
      }),
      error: null,
    });
    const res = await GET_DETAIL(makeRequest('/api/privacy/requests/x'), idCtx());
    expect(res.status).toBe(404);
  });
});

/* --- DETAIL PATCH --- */
describe('PATCH /api/privacy/requests/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/privacy/requests/x', { status: 'in_progress' }, 'PATCH'),
      idCtx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns updated request on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          privacy_requests: { data: { ...sampleRequest, status: 'in_progress' }, error: null },
        },
      }),
      error: null,
    });
    const res = await PATCH(
      makeJsonRequest('/api/privacy/requests/x', { status: 'in_progress' }, 'PATCH'),
      idCtx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('in_progress');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { privacy_requests: { data: null, error: { message: 'err' } } },
      }),
      error: null,
    });
    const res = await PATCH(
      makeJsonRequest('/api/privacy/requests/x', { status: 'in_progress' }, 'PATCH'),
      idCtx(),
    );
    expect(res.status).toBe(500);
  });
});

/* --- EVENTS GET --- */
describe('GET /api/privacy/requests/[id]/events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_EVENTS(makeRequest('/api/privacy/requests/x/events'), idCtx());
    expect(res.status).toBe(401);
  });

  it('returns events list', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { privacy_request_events: { data: [sampleEvent], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET_EVENTS(makeRequest('/api/privacy/requests/x/events'), idCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].event_type).toBe('status_changed');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { privacy_request_events: { data: null, error: { message: 'err' }, count: null } },
      }),
      error: null,
    });
    const res = await GET_EVENTS(makeRequest('/api/privacy/requests/x/events'), idCtx());
    expect(res.status).toBe(500);
  });
});

/* --- EVENTS POST --- */
describe('POST /api/privacy/requests/[id]/events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_EVENT(makeJsonRequest('/api/privacy/requests/x/events', {}), idCtx());
    expect(res.status).toBe(401);
  });

  it('returns 201 on valid event creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { privacy_request_events: { data: sampleEvent, error: null } },
      }),
      error: null,
    });
    const res = await POST_EVENT(
      makeJsonRequest('/api/privacy/requests/x/events', {
        event_type: 'status_changed',
        actor_user_id: '00000000-0000-4000-a000-000000000099',
      }),
      idCtx(),
    );
    expect(res.status).toBe(201);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { privacy_request_events: { data: null, error: { message: 'insert err' } } },
      }),
      error: null,
    });
    const res = await POST_EVENT(
      makeJsonRequest('/api/privacy/requests/x/events', {
        event_type: 'status_changed',
        actor_user_id: '00000000-0000-4000-a000-000000000099',
      }),
      idCtx(),
    );
    expect(res.status).toBe(500);
  });
});
