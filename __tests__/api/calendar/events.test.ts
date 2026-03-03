import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/microsoft/graph', () => ({
  getMicrosoftToken: vi.fn(),
  graphFetch: vi.fn(),
  buildGraphUrl: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { getMicrosoftToken, graphFetch, buildGraphUrl } from '@/lib/microsoft/graph';
import { GET, POST } from '@/app/api/calendar/events/route';
import { GET as GET_BY_ID } from '@/app/api/calendar/events/[id]/route';
import { mockClerkAuth, mockClerkUnauth, makeRequest, makeJsonRequest } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockGetToken = vi.mocked(getMicrosoftToken);
const mockGraphFetch = vi.mocked(graphFetch);
const mockBuildGraphUrl = vi.mocked(buildGraphUrl);

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event_1',
    subject: 'Team standup',
    bodyPreview: 'Daily sync',
    start: { dateTime: '2026-03-01T09:00:00', timeZone: 'America/Toronto' },
    end: { dateTime: '2026-03-01T09:30:00', timeZone: 'America/Toronto' },
    location: { displayName: 'Board Room' },
    organizer: { emailAddress: { name: 'Test', address: 'test@mdm.ca' } },
    attendees: [],
    isAllDay: false,
    webLink: 'https://outlook.office.com/calendar/event_1',
    onlineMeetingUrl: null,
    ...overrides,
  };
}

describe('GET /api/calendar/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildGraphUrl.mockReturnValue('https://graph.microsoft.com/v1.0/me/events');
    mockGetToken.mockResolvedValue('mock-ms-token');
  });

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);

    const res = await GET(makeRequest('/api/calendar/events'));
    expect(res.status).toBe(401);
  });

  it('fetches calendar events', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    const events = { value: [makeEvent()] };
    mockGraphFetch.mockResolvedValue(events);

    const res = await GET(makeRequest('/api/calendar/events'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.value).toHaveLength(1);
    expect(body.value[0].subject).toBe('Team standup');
  });

  it('passes date range filter when provided', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    mockGraphFetch.mockResolvedValue({ value: [] });

    await GET(
      makeRequest(
        '/api/calendar/events?startDateTime=2026-03-01T00:00:00&endDateTime=2026-03-31T23:59:59',
      ),
    );

    const calledUrl = mockGraphFetch.mock.calls[0][1] as string;
    const decoded = decodeURIComponent(calledUrl);
    expect(decoded).toContain('$filter=');
    expect(decoded).toContain('2026-03-01T00:00:00');
    expect(decoded).toContain('2026-03-31T23:59:59');
  });

  it('uses shared mailbox when specified', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    mockGraphFetch.mockResolvedValue({ value: [] });

    await GET(makeRequest('/api/calendar/events?mailbox=shared@mdm.ca'));

    expect(mockBuildGraphUrl).toHaveBeenCalledWith('/events', 'shared@mdm.ca');
  });

  it('returns 400 for invalid query params', async () => {
    mockClerkAuth(mockAuth, 'user_123');

    const res = await GET(makeRequest('/api/calendar/events?top=-5'));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/calendar/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildGraphUrl.mockReturnValue('https://graph.microsoft.com/v1.0/me/events');
    mockGetToken.mockResolvedValue('mock-ms-token');
  });

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);

    const res = await POST(
      makeJsonRequest('/api/calendar/events', {
        subject: 'Test',
        startDateTime: '2026-03-01T09:00:00',
        endDateTime: '2026-03-01T10:00:00',
      }),
    );
    expect(res.status).toBe(401);
  });

  it('creates a calendar event', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    const created = makeEvent({ id: 'new_event' });
    mockGraphFetch.mockResolvedValue(created);

    const res = await POST(
      makeJsonRequest('/api/calendar/events', {
        subject: 'Site visit',
        startDateTime: '2026-03-01T09:00:00',
        endDateTime: '2026-03-01T10:00:00',
        location: 'Job Site A',
      }),
    );

    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.id).toBe('new_event');

    expect(mockGraphFetch).toHaveBeenCalledWith(
      'mock-ms-token',
      'https://graph.microsoft.com/v1.0/me/events',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Site visit'),
      }),
    );
  });

  it('includes body and location in payload when provided', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    mockGraphFetch.mockResolvedValue(makeEvent());

    await POST(
      makeJsonRequest('/api/calendar/events', {
        subject: 'Review meeting',
        body: 'Discuss phase 2 estimates',
        startDateTime: '2026-03-01T14:00:00',
        endDateTime: '2026-03-01T15:00:00',
        location: 'Conference Room B',
      }),
    );

    const callBody = JSON.parse(mockGraphFetch.mock.calls[0][2]?.body as string);
    expect(callBody.body.content).toBe('Discuss phase 2 estimates');
    expect(callBody.body.contentType).toBe('Text');
    expect(callBody.location.displayName).toBe('Conference Room B');
  });

  it('returns 400 for missing required fields', async () => {
    mockClerkAuth(mockAuth, 'user_123');

    const res = await POST(
      makeJsonRequest('/api/calendar/events', {
        subject: '',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    mockClerkAuth(mockAuth, 'user_123');

    const res = await POST(
      makeRequest('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/calendar/events/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildGraphUrl.mockReturnValue('https://graph.microsoft.com/v1.0/me/events/event_1');
    mockGetToken.mockResolvedValue('mock-ms-token');
  });

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);

    const res = await GET_BY_ID(makeRequest('/api/calendar/events/event_1'), {
      params: Promise.resolve({ id: 'event_1' }),
    });
    expect(res.status).toBe(401);
  });

  it('fetches a single event by ID', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    const event = makeEvent();
    mockGraphFetch.mockResolvedValue(event);

    const res = await GET_BY_ID(makeRequest('/api/calendar/events/event_1'), {
      params: Promise.resolve({ id: 'event_1' }),
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.subject).toBe('Team standup');
    expect(mockBuildGraphUrl).toHaveBeenCalledWith('/events/event_1', undefined);
  });

  it('passes mailbox param for shared calendar', async () => {
    mockClerkAuth(mockAuth, 'user_123');
    mockGraphFetch.mockResolvedValue(makeEvent());

    await GET_BY_ID(makeRequest('/api/calendar/events/event_1?mailbox=shared@mdm.ca'), {
      params: Promise.resolve({ id: 'event_1' }),
    });

    expect(mockBuildGraphUrl).toHaveBeenCalledWith('/events/event_1', 'shared@mdm.ca');
  });
});
