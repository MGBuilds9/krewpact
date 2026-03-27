import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeActivity,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  resetFixtureCounter,
  TEST_IDS,
} from '@/__tests__/helpers';
import { GET } from '@/app/api/crm/activities/timeline/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeOutreachEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    lead_id: TEST_IDS.LEAD_ID,
    contact_id: TEST_IDS.CONTACT_ID,
    channel: 'email',
    direction: 'outbound',
    activity_type: 'initial_outreach',
    outcome: 'sent',
    outcome_detail: null,
    subject: 'Introduction Email',
    message_preview: 'Hi, I wanted to reach out...',
    notes: null,
    sequence_id: null,
    sequence_step: null,
    is_automated: false,
    occurred_at: '2026-01-15T12:00:00Z',
    created_by: TEST_IDS.USER_ID,
    ...overrides,
  };
}

describe('GET /api/crm/activities/timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);

    const req = makeRequest('/api/crm/activities/timeline?lead_id=' + TEST_IDS.LEAD_ID);
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 when no entity ID provided', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient();
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/activities/timeline');
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('At least one');
  });

  it('returns merged timeline for lead_id', async () => {
    mockClerkAuth(mockAuth);

    const activity = makeActivity({
      lead_id: TEST_IDS.LEAD_ID,
      created_at: '2026-01-10T10:00:00Z',
    });
    const outreach = makeOutreachEvent({
      lead_id: TEST_IDS.LEAD_ID,
      occurred_at: '2026-01-12T10:00:00Z',
    });

    const client = mockSupabaseClient({
      tables: {
        activities: { data: [activity], error: null },
        outreach: { data: [outreach], error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/activities/timeline?lead_id=' + TEST_IDS.LEAD_ID);
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.data[0].source).toBe('outreach');
    expect(body.data[1].source).toBe('activity');
  });

  it('returns empty timeline when no data', async () => {
    mockClerkAuth(mockAuth);

    const client = mockSupabaseClient({
      tables: {
        activities: { data: [], error: null },
        outreach: { data: [], error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/activities/timeline?lead_id=' + TEST_IDS.LEAD_ID);
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.hasMore).toBe(false);
  });

  it('merges activities and outreach events in chronological order', async () => {
    mockClerkAuth(mockAuth);

    const a1 = makeActivity({
      lead_id: TEST_IDS.LEAD_ID,
      created_at: '2026-01-01T08:00:00Z',
      title: 'First',
    });
    const a2 = makeActivity({
      lead_id: TEST_IDS.LEAD_ID,
      created_at: '2026-01-03T08:00:00Z',
      title: 'Third',
    });
    const o1 = makeOutreachEvent({
      lead_id: TEST_IDS.LEAD_ID,
      occurred_at: '2026-01-02T08:00:00Z',
      subject: 'Second',
    });
    const o2 = makeOutreachEvent({
      lead_id: TEST_IDS.LEAD_ID,
      occurred_at: '2026-01-04T08:00:00Z',
      subject: 'Fourth',
    });

    const client = mockSupabaseClient({
      tables: {
        activities: { data: [a1, a2], error: null },
        outreach: { data: [o1, o2], error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/activities/timeline?lead_id=' + TEST_IDS.LEAD_ID);
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(4);
    // Descending order: Fourth, Third, Second, First
    expect(body.data[0].title).toBe('Fourth');
    expect(body.data[1].title).toBe('Third');
    expect(body.data[2].title).toBe('Second');
    expect(body.data[3].title).toBe('First');
  });

  it('handles activities table error', async () => {
    mockClerkAuth(mockAuth);

    const client = mockSupabaseClient({
      tables: {
        activities: { data: null, error: { message: 'activities query failed' } },
        outreach: { data: [], error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/activities/timeline?lead_id=' + TEST_IDS.LEAD_ID);
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.message).toContain('activities query failed');
  });

  it('handles outreach table error', async () => {
    mockClerkAuth(mockAuth);

    const client = mockSupabaseClient({
      tables: {
        activities: { data: [], error: null },
        outreach: { data: null, error: { message: 'outreach query failed' } },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/activities/timeline?lead_id=' + TEST_IDS.LEAD_ID);
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.message).toContain('outreach query failed');
  });

  it('applies pagination (limit, offset)', async () => {
    mockClerkAuth(mockAuth);

    const activities = Array.from({ length: 5 }, (_, i) =>
      makeActivity({
        lead_id: TEST_IDS.LEAD_ID,
        created_at: `2026-01-${String(i + 1).padStart(2, '0')}T08:00:00Z`,
        title: `Activity ${i + 1}`,
      }),
    );

    const client = mockSupabaseClient({
      tables: {
        activities: { data: activities, error: null },
        outreach: { data: [], error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest(
      '/api/crm/activities/timeline?lead_id=' + TEST_IDS.LEAD_ID + '&limit=2&offset=1',
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(5);
    expect(body.hasMore).toBe(true);
    // Sorted desc: 5,4,3,2,1 — offset 1, limit 2 => items at index 1,2 => Activity 4, Activity 3
    expect(body.data[0].title).toBe('Activity 4');
    expect(body.data[1].title).toBe('Activity 3');
  });

  it('filters by opportunity_id', async () => {
    mockClerkAuth(mockAuth);

    const activity = makeActivity({
      opportunity_id: TEST_IDS.OPPORTUNITY_ID,
      created_at: '2026-01-10T10:00:00Z',
    });

    const client = mockSupabaseClient({
      tables: {
        activities: { data: [activity], error: null },
        outreach: { data: [], error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest(
      '/api/crm/activities/timeline?opportunity_id=' + TEST_IDS.OPPORTUNITY_ID,
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].source).toBe('activity');
    expect(client.from).toHaveBeenCalledWith('activities');
    expect(client.from).toHaveBeenCalledWith('outreach');
  });

  it('returns correct source field (activity vs outreach)', async () => {
    mockClerkAuth(mockAuth);

    const activity = makeActivity({
      lead_id: TEST_IDS.LEAD_ID,
      created_at: '2026-01-10T10:00:00Z',
    });
    const outreach = makeOutreachEvent({
      lead_id: TEST_IDS.LEAD_ID,
      occurred_at: '2026-01-11T10:00:00Z',
    });

    const client = mockSupabaseClient({
      tables: {
        activities: { data: [activity], error: null },
        outreach: { data: [outreach], error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/activities/timeline?lead_id=' + TEST_IDS.LEAD_ID);
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    const activityEntry = body.data.find((e: { source: string }) => e.source === 'activity');
    const outreachEntry = body.data.find((e: { source: string }) => e.source === 'outreach');

    expect(activityEntry).toBeDefined();
    expect(activityEntry.source).toBe('activity');
    expect(activityEntry.type).toBe(activity.activity_type);
    expect(activityEntry.title).toBe(activity.title);
    expect(activityEntry.owner_user_id).toBe(activity.owner_user_id);

    expect(outreachEntry).toBeDefined();
    expect(outreachEntry.source).toBe('outreach');
    expect(outreachEntry.type).toBe(outreach.channel);
    expect(outreachEntry.title).toBe(outreach.subject);
    expect(outreachEntry.owner_user_id).toBe(outreach.created_by);
    expect(outreachEntry.metadata.direction).toBe(outreach.direction);
    expect(outreachEntry.metadata.channel).toBe(outreach.channel);
  });
});
