/**
 * Tests for /api/portal/projects/[id]/survey (GET + POST).
 *
 * Covers: auth, portal access guard, GET existing survey, POST submission, validation.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { GET, POST } from '@/app/api/portal/projects/[id]/survey/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validPayload = {
  overall_rating: 5,
  communication_rating: 4,
  quality_rating: 5,
  schedule_rating: 3,
  comments: 'Great work overall.',
  would_recommend: true,
};

const sampleSurvey = {
  id: 'surv-1',
  ...validPayload,
  submitted_at: '2026-03-20T10:00:00Z',
};

describe('GET /api/portal/projects/[id]/survey', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/portal/projects/proj-1/survey'), makeContext('proj-1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when no portal access', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          portal_accounts: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/portal/projects/proj-1/survey'), makeContext('proj-1'));
    expect(res.status).toBe(403);
  });

  it('returns null survey when none submitted', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          portal_accounts: { data: { id: 'pa-1', status: 'active' }, error: null },
          portal_permissions: { data: { id: 'perm-1' }, error: null },
          portal_satisfaction_surveys: { data: null, error: null },
        },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/portal/projects/proj-1/survey'), makeContext('proj-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.survey).toBeNull();
  });

  it('returns existing survey when already submitted', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          portal_accounts: { data: { id: 'pa-1', status: 'active' }, error: null },
          portal_permissions: { data: { id: 'perm-1' }, error: null },
          portal_satisfaction_surveys: { data: sampleSurvey, error: null },
        },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/portal/projects/proj-1/survey'), makeContext('proj-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.survey.overall_rating).toBe(5);
  });
});

describe('POST /api/portal/projects/[id]/survey', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/portal/projects/proj-1/survey', validPayload),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 422 on invalid payload', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: {} }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/portal/projects/proj-1/survey', { overall_rating: 10 }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });

  it('submits survey and returns 201', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          portal_accounts: { data: { id: 'pa-1', status: 'active' }, error: null },
          portal_permissions: { data: { id: 'perm-1' }, error: null },
          portal_satisfaction_surveys: { data: sampleSurvey, error: null },
        },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/portal/projects/proj-1/survey', validPayload),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.overall_rating).toBe(5);
  });
});
