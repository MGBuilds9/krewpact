/**
 * Tests for /api/projects/[id]/daily-logs (GET list, POST create).
 *
 * Covers: auth, pagination, creation, validation, DB errors.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/notifications/dispatcher', () => ({
  dispatchNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET, POST } from '@/app/api/projects/[id]/daily-logs/route';
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

const sampleLog = {
  id: 'log-1',
  project_id: 'proj-1',
  log_date: '2026-03-05',
  weather: { temp: 5, condition: 'cloudy' },
  crew_count: 12,
  work_summary: 'Framing on second floor complete. Electrical rough-in started.',
  delays: null,
  safety_notes: 'All PPE compliance checked.',
  author_user_id: 'user_test_123',
  created_at: '2026-03-05T17:00:00Z',
};

describe('GET /api/projects/[id]/daily-logs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/projects/proj-1/daily-logs'), makeContext('proj-1'));
    expect(res.status).toBe(401);
  });

  it('returns paginated daily logs', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { project_daily_logs: { data: [sampleLog], error: null } },
      }),
    );

    const res = await GET(makeRequest('/api/projects/proj-1/daily-logs'), makeContext('proj-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].log_date).toBe('2026-03-05');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { project_daily_logs: { data: null, error: { message: 'DB error' } } },
      }),
    );

    const res = await GET(makeRequest('/api/projects/proj-1/daily-logs'), makeContext('proj-1'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/projects/[id]/daily-logs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/daily-logs', { log_date: '2026-03-05' }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(401);
  });

  it('creates a daily log', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { project_daily_logs: { data: sampleLog, error: null } },
      }),
    );

    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/daily-logs', {
        log_date: '2026-03-05',
        crew_count: 12,
        work_summary: 'Framing complete',
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.log_date).toBe('2026-03-05');
  });

  it('returns 400 for missing log_date', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/daily-logs', { work_summary: 'No date' }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeRequest('/api/projects/proj-1/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{bad',
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });
});
