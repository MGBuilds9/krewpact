import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks BEFORE imports
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET, PATCH } from '@/app/api/crm/contacts/[id]/preferences/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

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
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          contacts: {
            data: { id: CONTACT_ID, communication_prefs: prefs },
            error: null,
          },
        },
      }),
    );

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
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          contacts: {
            data: { id: CONTACT_ID, communication_prefs: null },
            error: null,
          },
        },
      }),
    );

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
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          contacts: {
            data: null,
            error: { code: 'PGRST116', message: 'Not found' },
          },
        },
      }),
    );

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
    const updatedPrefs = { email_opt_in: true, frequency: 'monthly' };
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          contacts: {
            data: { id: CONTACT_ID, communication_prefs: existingPrefs },
            error: null,
          },
        },
      }),
    );

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
    mockCreateUserClient.mockResolvedValue(mockSupabaseClient());

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
    mockCreateUserClient.mockResolvedValue(mockSupabaseClient());

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
    expect(body.error).toBe('Invalid JSON');
  });
});
