import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

// Mock outcome router
vi.mock('@/lib/crm/outcome-router', () => ({
  routeOutcome: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  resetFixtureCounter,
} from '@/__tests__/helpers';
import { POST } from '@/app/api/crm/activities/[id]/disposition/route';
import { routeOutcome } from '@/lib/crm/outcome-router';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockRouteOutcome = vi.mocked(routeOutcome);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const ACTIVITY_ID = 'act-test-001';

describe('POST /api/crm/activities/[id]/disposition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);

    const res = await POST(
      makeJsonRequest(`/api/crm/activities/${ACTIVITY_ID}/disposition`, {
        outcome: 'interested',
      }),
      makeContext(ACTIVITY_ID),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for invalid outcome', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: {} as never,
      error: null,
    });

    const res = await POST(
      makeJsonRequest(`/api/crm/activities/${ACTIVITY_ID}/disposition`, {
        outcome: 'invalid_outcome',
      }),
      makeContext(ACTIVITY_ID),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for missing outcome', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: {} as never,
      error: null,
    });

    const res = await POST(
      makeJsonRequest(`/api/crm/activities/${ACTIVITY_ID}/disposition`, {}),
      makeContext(ACTIVITY_ID),
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: {} as never,
      error: null,
    });

    const res = await POST(
      makeRequest(`/api/crm/activities/${ACTIVITY_ID}/disposition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }),
      makeContext(ACTIVITY_ID),
    );

    expect(res.status).toBe(400);
  });

  it('calls routeOutcome with correct params for interested', async () => {
    mockClerkAuth(mockAuth);
    const fakeClient = {} as never;
    mockCreateUserClientSafe.mockResolvedValue({
      client: fakeClient,
      error: null,
    });
    mockRouteOutcome.mockResolvedValue({
      activityUpdated: true,
      leadStatusChanged: 'qualified',
      sequenceStopped: true,
      opportunityCreated: true,
      opportunityId: 'opp-1',
    });

    const res = await POST(
      makeJsonRequest(`/api/crm/activities/${ACTIVITY_ID}/disposition`, {
        outcome: 'interested',
      }),
      makeContext(ACTIVITY_ID),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.activityUpdated).toBe(true);
    expect(body.leadStatusChanged).toBe('qualified');
    expect(body.opportunityCreated).toBe(true);

    expect(mockRouteOutcome).toHaveBeenCalledWith(fakeClient, ACTIVITY_ID, 'interested', {
      followUpDays: undefined,
      notes: undefined,
    });
  });

  it('passes followUpDays and notes to routeOutcome', async () => {
    mockClerkAuth(mockAuth);
    const fakeClient = {} as never;
    mockCreateUserClientSafe.mockResolvedValue({
      client: fakeClient,
      error: null,
    });
    mockRouteOutcome.mockResolvedValue({
      activityUpdated: true,
      followUpCreated: true,
      followUpActivityId: 'act-fu-1',
    });

    const res = await POST(
      makeJsonRequest(`/api/crm/activities/${ACTIVITY_ID}/disposition`, {
        outcome: 'follow_up',
        followUpDays: 7,
        notes: 'Call back Thursday',
      }),
      makeContext(ACTIVITY_ID),
    );

    expect(res.status).toBe(200);
    expect(mockRouteOutcome).toHaveBeenCalledWith(fakeClient, ACTIVITY_ID, 'follow_up', {
      followUpDays: 7,
      notes: 'Call back Thursday',
    });
  });

  it('returns 404 when routeOutcome throws not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: {} as never,
      error: null,
    });
    mockRouteOutcome.mockRejectedValue(new Error('Activity not found: act-bad'));

    const res = await POST(
      makeJsonRequest(`/api/crm/activities/${ACTIVITY_ID}/disposition`, {
        outcome: 'interested',
      }),
      makeContext(ACTIVITY_ID),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 500 for unexpected errors', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: {} as never,
      error: null,
    });
    mockRouteOutcome.mockRejectedValue(new Error('DB connection failed'));

    const res = await POST(
      makeJsonRequest(`/api/crm/activities/${ACTIVITY_ID}/disposition`, {
        outcome: 'not_interested',
      }),
      makeContext(ACTIVITY_ID),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.message).toContain('Failed to process disposition');
  });

  it('validates followUpDays range (rejects 0)', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: {} as never,
      error: null,
    });

    const res = await POST(
      makeJsonRequest(`/api/crm/activities/${ACTIVITY_ID}/disposition`, {
        outcome: 'follow_up',
        followUpDays: 0,
      }),
      makeContext(ACTIVITY_ID),
    );

    expect(res.status).toBe(400);
  });

  it('validates followUpDays range (rejects 31)', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: {} as never,
      error: null,
    });

    const res = await POST(
      makeJsonRequest(`/api/crm/activities/${ACTIVITY_ID}/disposition`, {
        outcome: 'follow_up',
        followUpDays: 31,
      }),
      makeContext(ACTIVITY_ID),
    );

    expect(res.status).toBe(400);
  });
});
