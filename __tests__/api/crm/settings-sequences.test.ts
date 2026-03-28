vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/api/org', () => ({}));
vi.mock('@/lib/request-context', () => ({
  requestContext: { run: vi.fn((_ctx, fn) => fn()) },
  generateRequestId: vi.fn().mockReturnValue('req_test'),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

import { auth } from '@clerk/nextjs/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeJsonRequest, makeRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { mockSupabaseClient } from '@/__tests__/helpers/mock-supabase';
import { GET, PATCH } from '@/app/api/crm/settings/sequences/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateClient = vi.mocked(createUserClientSafe);

describe('GET /api/crm/settings/sequences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/settings/sequences'));
    expect(res.status).toBe(401);
  });

  it('returns default sequence settings when no config exists', async () => {
    const client = mockSupabaseClient({
      tables: {
        org_settings: { data: null, error: { code: 'PGRST116', message: 'not found' } },
      },
    });
    mockCreateClient.mockResolvedValue({ client, error: null } as never);

    const res = await GET(makeRequest('/api/crm/settings/sequences'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.max_enrollments_per_day).toBe(50);
    expect(body.send_window_start).toBe('09:00');
    expect(body.send_window_end).toBe('17:00');
    expect(body.throttle_per_hour).toBe(20);
    expect(body.auto_unenroll_on_reply).toBe(true);
  });

  it('returns stored sequence defaults when they exist', async () => {
    const stored = {
      max_enrollments_per_day: 100,
      send_window_start: '08:00',
      send_window_end: '18:00',
      throttle_per_hour: 30,
      auto_unenroll_on_reply: false,
    };
    const client = mockSupabaseClient({
      tables: {
        org_settings: { data: { workflow: { sequence_defaults: stored } }, error: null },
      },
    });
    mockCreateClient.mockResolvedValue({ client, error: null } as never);

    const res = await GET(makeRequest('/api/crm/settings/sequences'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.max_enrollments_per_day).toBe(100);
    expect(body.auto_unenroll_on_reply).toBe(false);
  });
});

describe('PATCH /api/crm/settings/sequences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(makeJsonRequest('/api/crm/settings/sequences', {}, 'PATCH'));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid time format', async () => {
    const client = mockSupabaseClient();
    mockCreateClient.mockResolvedValue({ client, error: null } as never);

    const res = await PATCH(
      makeJsonRequest(
        '/api/crm/settings/sequences',
        {
          max_enrollments_per_day: 50,
          send_window_start: 'not-a-time',
          send_window_end: '17:00',
          throttle_per_hour: 20,
          auto_unenroll_on_reply: true,
        },
        'PATCH',
      ),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 400 when required fields are missing', async () => {
    const client = mockSupabaseClient();
    mockCreateClient.mockResolvedValue({ client, error: null } as never);

    const res = await PATCH(
      makeJsonRequest('/api/crm/settings/sequences', { max_enrollments_per_day: 50 }, 'PATCH'),
    );
    expect(res.status).toBe(400);
  });

  it('updates sequence defaults successfully', async () => {
    const newDefaults = {
      max_enrollments_per_day: 75,
      send_window_start: '10:00',
      send_window_end: '16:00',
      throttle_per_hour: 15,
      auto_unenroll_on_reply: false,
    };
    const client = mockSupabaseClient({
      tables: {
        org_settings: {
          data: { workflow: { sequence_defaults: newDefaults } },
          error: null,
        },
      },
    });
    mockCreateClient.mockResolvedValue({ client, error: null } as never);

    const res = await PATCH(
      makeJsonRequest(
        '/api/crm/settings/sequences',
        newDefaults as Record<string, unknown>,
        'PATCH',
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.max_enrollments_per_day).toBe(75);
    expect(body.auto_unenroll_on_reply).toBe(false);
  });
});
