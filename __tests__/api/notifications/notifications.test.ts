/**
 * Tests for /api/notifications (GET + POST),
 * /api/notifications/[id] (PATCH + DELETE),
 * /api/notifications/preferences (GET + PATCH),
 * /api/notifications/dispatch (POST).
 * Tables: notifications, notification_preferences
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/notifications/dispatcher', () => ({
  dispatchNotification: vi.fn().mockResolvedValue(undefined),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  TEST_IDS,
} from '@/__tests__/helpers';
import { DELETE, PATCH } from '@/app/api/notifications/[id]/route';
import { POST as POST_DISPATCH } from '@/app/api/notifications/dispatch/route';
import { GET as GET_PREFS, PATCH as PATCH_PREFS } from '@/app/api/notifications/preferences/route';
import { GET as GET_LIST, POST as POST_ACTION } from '@/app/api/notifications/route';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockDispatch = vi.mocked(dispatchNotification);
const NOTIF_ID = '00000000-0000-4000-a000-000000000801';

function notifCtx(id: string = NOTIF_ID) {
  return { params: Promise.resolve({ id }) };
}

const sampleNotification = {
  id: NOTIF_ID,
  user_id: TEST_IDS.USER_ID,
  portal_account_id: null,
  channel: 'in_app',
  title: 'Test Notification',
  message: 'You have a new update.',
  state: 'unread',
  read_at: null,
  send_at: null,
  sent_at: null,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

const samplePrefs = {
  id: '00000000-0000-4000-a000-000000000802',
  user_id: TEST_IDS.USER_ID,
  in_app_enabled: true,
  email_enabled: true,
  push_enabled: false,
  quiet_hours: null,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

/* --- LIST --- */
describe('GET /api/notifications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_LIST(makeRequest('/api/notifications'));
    expect(res.status).toBe(401);
  });

  it('returns paginated notifications', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { notifications: { data: [sampleNotification], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET_LIST(makeRequest('/api/notifications'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('Test Notification');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { notifications: { data: null, error: { message: 'err' }, count: null } },
      }),
      error: null,
    });
    const res = await GET_LIST(makeRequest('/api/notifications'));
    expect(res.status).toBe(500);
  });
});

/* --- MARK ALL READ --- */
describe('POST /api/notifications (mark_all_read)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_ACTION(
      makeJsonRequest('/api/notifications', { action: 'mark_all_read' }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid action', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_ACTION(makeJsonRequest('/api/notifications', { action: 'invalid' }));
    expect(res.status).toBe(400);
  });

  it('marks all read successfully', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { notifications: { data: null, error: null } } }),
      error: null,
    });
    const res = await POST_ACTION(
      makeJsonRequest('/api/notifications', { action: 'mark_all_read' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

/* --- PATCH [id] --- */
describe('PATCH /api/notifications/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/notifications/x', { read: true }, 'PATCH'),
      notifCtx(),
    );
    expect(res.status).toBe(401);
  });

  it('updates notification on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          notifications: {
            data: { ...sampleNotification, state: 'read' },
            error: null,
          },
        },
      }),
      error: null,
    });
    const res = await PATCH(
      makeJsonRequest('/api/notifications/x', { read: true }, 'PATCH'),
      notifCtx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.state).toBe('read');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { notifications: { data: null, error: { message: 'err' } } },
      }),
      error: null,
    });
    const res = await PATCH(
      makeJsonRequest('/api/notifications/x', { read: true }, 'PATCH'),
      notifCtx(),
    );
    expect(res.status).toBe(500);
  });
});

/* --- DELETE [id] --- */
describe('DELETE /api/notifications/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await DELETE(makeRequest('/api/notifications/x'), notifCtx());
    expect(res.status).toBe(401);
  });

  it('deletes notification on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { notifications: { data: null, error: null } } }),
      error: null,
    });
    const res = await DELETE(makeRequest('/api/notifications/x'), notifCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

/* --- PREFERENCES GET --- */
describe('GET /api/notifications/preferences', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_PREFS(makeRequest('/api/notifications/preferences'));
    expect(res.status).toBe(401);
  });

  it('returns user preferences', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { notification_preferences: { data: samplePrefs, error: null } },
      }),
      error: null,
    });
    const res = await GET_PREFS(makeRequest('/api/notifications/preferences'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.in_app_enabled).toBe(true);
    expect(body.email_enabled).toBe(true);
  });

  it('returns defaults when no preferences exist (PGRST116)', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          notification_preferences: {
            data: null,
            error: { code: 'PGRST116', message: 'not found' },
          },
        },
      }),
      error: null,
    });
    const res = await GET_PREFS(makeRequest('/api/notifications/preferences'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.in_app_enabled).toBe(true);
    expect(body.push_enabled).toBe(false);
  });
});

/* --- PREFERENCES PATCH --- */
describe('PATCH /api/notifications/preferences', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH_PREFS(
      makeJsonRequest('/api/notifications/preferences', { email_enabled: false }, 'PATCH'),
    );
    expect(res.status).toBe(401);
  });

  it('upserts preferences on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          notification_preferences: {
            data: { ...samplePrefs, email_enabled: false },
            error: null,
          },
        },
      }),
      error: null,
    });
    const res = await PATCH_PREFS(
      makeJsonRequest('/api/notifications/preferences', { email_enabled: false }, 'PATCH'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email_enabled).toBe(false);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { notification_preferences: { data: null, error: { message: 'err' } } },
      }),
      error: null,
    });
    const res = await PATCH_PREFS(
      makeJsonRequest('/api/notifications/preferences', { email_enabled: false }, 'PATCH'),
    );
    expect(res.status).toBe(500);
  });
});

/* --- DISPATCH --- */
describe('POST /api/notifications/dispatch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_DISPATCH(
      makeJsonRequest('/api/notifications/dispatch', { type: 'test' }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when type is missing', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_DISPATCH(makeJsonRequest('/api/notifications/dispatch', { foo: 'bar' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('type');
  });

  it('dispatches notification on success', async () => {
    mockClerkAuth(mockAuth);
    mockDispatch.mockResolvedValue(undefined);
    const res = await POST_DISPATCH(
      makeJsonRequest('/api/notifications/dispatch', {
        type: 'contract_signed',
        contract_id: '123',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when dispatcher throws', async () => {
    mockClerkAuth(mockAuth);
    mockDispatch.mockRejectedValue(new Error('Send failed'));
    const res = await POST_DISPATCH(
      makeJsonRequest('/api/notifications/dispatch', {
        type: 'contract_signed',
        contract_id: '123',
      }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Send failed');
  });
});
