import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeActivity,
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  resetFixtureCounter,
  TEST_IDS,
} from '@/__tests__/helpers';
import { DELETE, GET as GET_ID, PATCH } from '@/app/api/crm/activities/[id]/route';
import { GET, POST } from '@/app/api/crm/activities/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ============================================================
// GET /api/crm/activities
// ============================================================
describe('GET /api/crm/activities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/activities'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns activities list', async () => {
    const activities = [makeActivity(), makeActivity({ title: 'Second call' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { activities: { data: activities, error: null } },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/crm/activities'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(activities);
    expect(typeof body.total).toBe('number');
    expect(typeof body.hasMore).toBe('boolean');
  });

  it('filters by opportunity_id', async () => {
    const activities = [makeActivity()];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { activities: { data: activities, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(
      makeRequest('/api/crm/activities?opportunity_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('activities');
  });

  it('filters by lead_id', async () => {
    const activities = [makeActivity({ lead_id: TEST_IDS.LEAD_ID })];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { activities: { data: activities, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(
      makeRequest('/api/crm/activities?lead_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('activities');
  });

  it('filters by account_id', async () => {
    const activities = [makeActivity({ account_id: TEST_IDS.ACCOUNT_ID })];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { activities: { data: activities, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(
      makeRequest('/api/crm/activities?account_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('activities');
  });

  it('filters by activity_type', async () => {
    const activities = [makeActivity({ activity_type: 'email' })];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { activities: { data: activities, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/crm/activities?activity_type=email'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(activities);
    expect(typeof body.total).toBe('number');
    expect(typeof body.hasMore).toBe('boolean');
  });
});

// ============================================================
// POST /api/crm/activities
// ============================================================
describe('POST /api/crm/activities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('creates activity linked to opportunity', async () => {
    const created = makeActivity();
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { activities: { data: created, error: null } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/crm/activities', {
        activity_type: 'call',
        title: 'Follow-up call',
        opportunity_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.activity_type).toBe('call');
  });

  it('creates activity linked to lead', async () => {
    const created = makeActivity({
      lead_id: TEST_IDS.LEAD_ID,
      opportunity_id: null,
    });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { activities: { data: created, error: null } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/crm/activities', {
        activity_type: 'meeting',
        title: 'Site visit',
        lead_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      }),
    );
    expect(res.status).toBe(201);
  });

  it('fails when no entity ID provided', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/activities', {
        activity_type: 'call',
        title: 'Orphan activity',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('fails with invalid activity_type', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/activities', {
        activity_type: 'invalid_type',
        title: 'Bad type',
        opportunity_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      }),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /api/crm/activities/[id]
// ============================================================
describe('GET /api/crm/activities/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns activity by id', async () => {
    const activity = makeActivity();
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { activities: { data: activity, error: null } },
      }),
      error: null,
    });

    const res = await GET_ID(makeRequest('/api/crm/activities/123'), makeContext(activity.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Follow-up call');
  });

  it('returns 404 for non-existent activity', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          activities: {
            data: null,
            error: { message: 'Row not found', code: 'PGRST116' },
          },
        },
      }),
      error: null,
    });

    const res = await GET_ID(
      makeRequest('/api/crm/activities/nonexistent'),
      makeContext('nonexistent'),
    );
    expect(res.status).toBe(404);
  });
});

// ============================================================
// PATCH /api/crm/activities/[id]
// ============================================================
describe('PATCH /api/crm/activities/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('updates activity', async () => {
    const updated = makeActivity({ title: 'Updated call notes' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { activities: { data: updated, error: null } },
      }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest('/api/crm/activities/123', { title: 'Updated call notes' }, 'PATCH'),
      makeContext(updated.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Updated call notes');
  });
});

// ============================================================
// DELETE /api/crm/activities/[id]
// ============================================================
describe('DELETE /api/crm/activities/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('deletes activity', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { activities: { data: null, error: null } },
      }),
      error: null,
    });

    const res = await DELETE(makeRequest('/api/crm/activities/123'), makeContext('some-id'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
