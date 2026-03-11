/**
 * Tests for portal messaging (Epic 12.2).
 *
 * Verifies:
 * - Auth gating on all endpoints
 * - Portal access scoping (portal_accounts → portal_permissions)
 * - GET returns paginated messages
 * - POST creates messages with validation
 * - GET [msgId] returns single message and marks as read
 * - PATCH [msgId] updates is_read status
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi
    .fn()
    .mockResolvedValue({
      client: { from: (...args: unknown[]) => mockFrom(...args) },
      error: null,
    }),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { GET, POST } from '@/app/api/portal/projects/[id]/messages/route';
import { GET as GET_SINGLE, PATCH } from '@/app/api/portal/projects/[id]/messages/[msgId]/route';
import { mockClerkAuth, mockClerkUnauth, makeRequest, makeJsonRequest } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);

/**
 * Build a chainable Supabase mock.
 * Each method returns itself, with terminal methods resolving the response.
 */
function chainMock(response: { data: unknown; error: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(response);
  chain.single = vi.fn().mockResolvedValue(response);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: unknown) => void) =>
    resolve({ data: response.data, error: response.error, count: response.count ?? null });
  return chain;
}

/** Setup multi-table mock with per-table responses keyed by table name order */
function setupTableMocks(
  tableResponses: Record<string, { data: unknown; error: unknown; count?: number | null }>,
) {
  const callOrder: string[] = [];
  mockFrom.mockImplementation((table: string) => {
    callOrder.push(table);
    const resp = tableResponses[table] ?? { data: null, error: null };
    return chainMock(resp);
  });
  return callOrder;
}

// Reusable portal access responses
const activePortalAccount = { data: { id: 'pa-1', status: 'active' }, error: null };
const portalPermission = { data: { id: 'perm-1' }, error: null };
const noPortalAccount = { data: null, error: { code: 'PGRST116', message: 'not found' } };

const sampleMessage = {
  id: 'msg-1',
  project_id: 'proj-1',
  sender_id: 'user_test_123',
  sender_type: 'client',
  subject: 'Test Subject',
  body: 'Hello world',
  is_read: false,
  created_at: '2026-03-08T10:00:00Z',
};

// ─── GET /api/portal/projects/[id]/messages ───

describe('GET /api/portal/projects/[id]/messages', () => {
  const route = (id: string) => makeRequest(`/api/portal/projects/${id}/messages`);
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(route('proj-1'), ctx('proj-1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when no portal account', async () => {
    mockClerkAuth(mockAuth);
    setupTableMocks({
      portal_accounts: noPortalAccount,
    });

    const res = await GET(route('proj-1'), ctx('proj-1'));
    expect(res.status).toBe(403);
  });

  it('returns 403 when portal account is inactive', async () => {
    mockClerkAuth(mockAuth);
    setupTableMocks({
      portal_accounts: { data: { id: 'pa-1', status: 'pending' }, error: null },
    });

    const res = await GET(route('proj-1'), ctx('proj-1'));
    expect(res.status).toBe(403);
  });

  it('returns 403 when no permission for project', async () => {
    mockClerkAuth(mockAuth);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chainMock(activePortalAccount);
      // portal_permissions — no match
      return chainMock({ data: null, error: { code: 'PGRST116', message: 'not found' } });
    });

    const res = await GET(route('proj-1'), ctx('proj-1'));
    expect(res.status).toBe(403);
  });

  it('returns paginated messages on success', async () => {
    mockClerkAuth(mockAuth);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chainMock(activePortalAccount);
      if (callCount === 2) return chainMock(portalPermission);
      if (callCount === 3) {
        // portal_messages query
        return chainMock({
          data: [sampleMessage],
          error: null,
          count: 1,
        });
      }
      // portal_view_logs insert
      return chainMock({ data: null, error: null });
    });

    const res = await GET(route('proj-1'), ctx('proj-1'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].subject).toBe('Test Subject');
    expect(json.total).toBe(1);
  });
});

// ─── POST /api/portal/projects/[id]/messages ───

describe('POST /api/portal/projects/[id]/messages', () => {
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeJsonRequest('/api/portal/projects/proj-1/messages', { message: 'hi' });
    const res = await POST(req, ctx('proj-1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when message field is missing', async () => {
    mockClerkAuth(mockAuth);
    const req = makeJsonRequest('/api/portal/projects/proj-1/messages', { subject: 'No body' });
    const res = await POST(req, ctx('proj-1'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('message is required');
  });

  it('returns 403 when no portal access', async () => {
    mockClerkAuth(mockAuth);
    setupTableMocks({
      portal_accounts: noPortalAccount,
    });

    const req = makeJsonRequest('/api/portal/projects/proj-1/messages', { message: 'hello' });
    const res = await POST(req, ctx('proj-1'));
    expect(res.status).toBe(403);
  });

  it('creates message and returns 201', async () => {
    mockClerkAuth(mockAuth);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chainMock(activePortalAccount);
      if (callCount === 2) return chainMock(portalPermission);
      if (callCount === 3) {
        // portal_messages insert
        return chainMock({ data: { ...sampleMessage, id: 'msg-new' }, error: null });
      }
      // notifications insert (fire-and-forget)
      return chainMock({ data: null, error: null });
    });

    const req = makeJsonRequest('/api/portal/projects/proj-1/messages', {
      subject: 'Test Subject',
      message: 'Hello world',
    });
    const res = await POST(req, ctx('proj-1'));
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.id).toBe('msg-new');
  });

  it('returns 400 for invalid JSON', async () => {
    mockClerkAuth(mockAuth);
    const req = makeRequest('/api/portal/projects/proj-1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });
    const res = await POST(req, ctx('proj-1'));
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/portal/projects/[id]/messages/[msgId] ───

describe('GET /api/portal/projects/[id]/messages/[msgId]', () => {
  const ctx = (id: string, msgId: string) => ({
    params: Promise.resolve({ id, msgId }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeRequest('/api/portal/projects/proj-1/messages/msg-1');
    const res = await GET_SINGLE(req, ctx('proj-1', 'msg-1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when no portal access', async () => {
    mockClerkAuth(mockAuth);
    setupTableMocks({
      portal_accounts: noPortalAccount,
    });

    const req = makeRequest('/api/portal/projects/proj-1/messages/msg-1');
    const res = await GET_SINGLE(req, ctx('proj-1', 'msg-1'));
    expect(res.status).toBe(403);
  });

  it('returns single message and marks as read', async () => {
    mockClerkAuth(mockAuth);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chainMock(activePortalAccount);
      if (callCount === 2) return chainMock(portalPermission);
      if (callCount === 3) {
        // portal_messages select single
        return chainMock({ data: { ...sampleMessage, is_read: false }, error: null });
      }
      // portal_messages update (mark as read)
      return chainMock({ data: null, error: null });
    });

    const req = makeRequest('/api/portal/projects/proj-1/messages/msg-1');
    const res = await GET_SINGLE(req, ctx('proj-1', 'msg-1'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.id).toBe('msg-1');
    expect(json.subject).toBe('Test Subject');

    // Verify update was called (callCount should be 4 = pa + perm + select + update)
    expect(callCount).toBe(4);
  });

  it('returns 404 when message not found', async () => {
    mockClerkAuth(mockAuth);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chainMock(activePortalAccount);
      if (callCount === 2) return chainMock(portalPermission);
      // portal_messages — not found
      return chainMock({ data: null, error: { code: 'PGRST116', message: 'not found' } });
    });

    const req = makeRequest('/api/portal/projects/proj-1/messages/msg-missing');
    const res = await GET_SINGLE(req, ctx('proj-1', 'msg-missing'));
    expect(res.status).toBe(404);
  });

  it('skips mark-as-read when already read', async () => {
    mockClerkAuth(mockAuth);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chainMock(activePortalAccount);
      if (callCount === 2) return chainMock(portalPermission);
      // portal_messages — already read
      return chainMock({ data: { ...sampleMessage, is_read: true }, error: null });
    });

    const req = makeRequest('/api/portal/projects/proj-1/messages/msg-1');
    const res = await GET_SINGLE(req, ctx('proj-1', 'msg-1'));
    expect(res.status).toBe(200);

    // No update call — should be only 3 table calls
    expect(callCount).toBe(3);
  });
});

// ─── PATCH /api/portal/projects/[id]/messages/[msgId] ───

describe('PATCH /api/portal/projects/[id]/messages/[msgId]', () => {
  const ctx = (id: string, msgId: string) => ({
    params: Promise.resolve({ id, msgId }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const req = makeJsonRequest(
      '/api/portal/projects/proj-1/messages/msg-1',
      { is_read: true },
      'PATCH',
    );
    const res = await PATCH(req, ctx('proj-1', 'msg-1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when is_read is not boolean', async () => {
    mockClerkAuth(mockAuth);
    const req = makeJsonRequest(
      '/api/portal/projects/proj-1/messages/msg-1',
      { is_read: 'yes' },
      'PATCH',
    );
    const res = await PATCH(req, ctx('proj-1', 'msg-1'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('is_read');
  });

  it('updates is_read and returns message', async () => {
    mockClerkAuth(mockAuth);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chainMock(activePortalAccount);
      if (callCount === 2) return chainMock(portalPermission);
      // portal_messages update
      return chainMock({
        data: { ...sampleMessage, is_read: true, updated_at: '2026-03-08T11:00:00Z' },
        error: null,
      });
    });

    const req = makeJsonRequest(
      '/api/portal/projects/proj-1/messages/msg-1',
      { is_read: true },
      'PATCH',
    );
    const res = await PATCH(req, ctx('proj-1', 'msg-1'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.is_read).toBe(true);
  });

  it('returns 404 when message not found', async () => {
    mockClerkAuth(mockAuth);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chainMock(activePortalAccount);
      if (callCount === 2) return chainMock(portalPermission);
      return chainMock({ data: null, error: { code: 'PGRST116', message: 'not found' } });
    });

    const req = makeJsonRequest(
      '/api/portal/projects/proj-1/messages/msg-1',
      { is_read: true },
      'PATCH',
    );
    const res = await PATCH(req, ctx('proj-1', 'msg-1'));
    expect(res.status).toBe(404);
  });
});
