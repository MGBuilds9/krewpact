import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks BEFORE imports
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/logger', () => {
  const m = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() };
  m.child.mockReturnValue(m);
  return { logger: m };
});
vi.mock('@/lib/request-context', () => ({
  requestContext: { run: (_: unknown, fn: () => unknown) => fn() },
  generateRequestId: () => 'req_test',
  getRequestContext: () => undefined,
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  resetFixtureCounter,
} from '@/__tests__/helpers';
import { GET, PATCH } from '@/app/api/crm/contacts/[id]/preferences/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const CONTACT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

describe('GET /api/crm/contacts/[id]/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/contacts/1/preferences'), makeContext('1'));
    expect(res.status).toBe(401);
  });

  it('returns communication prefs for a contact', async () => {
    const prefs = { email_opt_in: true, preferred_channel: 'email', frequency: 'weekly' };
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          contacts: {
            data: { id: CONTACT_ID, communication_prefs: prefs },
            error: null,
          },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest(`/api/crm/contacts/${CONTACT_ID}/preferences`),
      makeContext(CONTACT_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.communication_prefs).toEqual(prefs);
  });

  it('returns empty object when prefs are null', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          contacts: {
            data: { id: CONTACT_ID, communication_prefs: null },
            error: null,
          },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest(`/api/crm/contacts/${CONTACT_ID}/preferences`),
      makeContext(CONTACT_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.communication_prefs).toEqual({});
  });

  it('returns 404 when contact not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          contacts: {
            data: null,
            error: { code: 'PGRST116', message: 'Not found' },
          },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest(`/api/crm/contacts/${CONTACT_ID}/preferences`),
      makeContext(CONTACT_ID),
    );
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/crm/contacts/[id]/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/crm/contacts/1/preferences', { email_opt_in: true }, 'PATCH'),
      makeContext('1'),
    );
    expect(res.status).toBe(401);
  });

  it('updates communication prefs', async () => {
    const existingPrefs = { email_opt_in: false, frequency: 'monthly' };
    const _updatedPrefs = { email_opt_in: true, frequency: 'monthly' };
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          contacts: {
            data: { id: CONTACT_ID, communication_prefs: existingPrefs },
            error: null,
          },
        },
      }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest(
        `/api/crm/contacts/${CONTACT_ID}/preferences`,
        { email_opt_in: true },
        'PATCH',
      ),
      makeContext(CONTACT_ID),
    );
    expect(res.status).toBe(200);
  });

  it('rejects invalid preferred_channel', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({ client: mockSupabaseClient(), error: null });

    const res = await PATCH(
      makeJsonRequest(
        `/api/crm/contacts/${CONTACT_ID}/preferences`,
        { preferred_channel: 'fax' },
        'PATCH',
      ),
      makeContext(CONTACT_ID),
    );
    expect(res.status).toBe(400);
  });

  it('rejects invalid frequency', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({ client: mockSupabaseClient(), error: null });

    const res = await PATCH(
      makeJsonRequest(
        `/api/crm/contacts/${CONTACT_ID}/preferences`,
        { frequency: 'hourly' },
        'PATCH',
      ),
      makeContext(CONTACT_ID),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    mockClerkAuth(mockAuth);
    const req = makeRequest(`/api/crm/contacts/${CONTACT_ID}/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });

    const res = await PATCH(req, makeContext(CONTACT_ID));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_JSON');
  });
});
