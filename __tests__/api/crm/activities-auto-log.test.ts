import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

// Mock email-activity-matcher
vi.mock('@/lib/crm/email-activity-matcher', () => ({
  matchEmailToEntities: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { matchEmailToEntities } from '@/lib/crm/email-activity-matcher';
import { POST } from '@/app/api/crm/activities/auto-log/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeJsonRequest,
  makeRequest,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);
const mockMatchEmail = vi.mocked(matchEmailToEntities);

describe('POST /api/crm/activities/auto-log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/activities/auto-log', {
        email_address: 'test@example.com',
        subject: 'Hello',
        direction: 'inbound',
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid body', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/activities/auto-log', {
        email_address: 'not-an-email',
        subject: '',
        direction: 'invalid',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeRequest('/api/crm/activities/auto-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns matched:false when no entities match', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient();
    mockCreateUserClient.mockResolvedValue(client);
    mockMatchEmail.mockResolvedValue({
      leads: [],
      contacts: [],
      accounts: [],
    });

    const res = await POST(
      makeJsonRequest('/api/crm/activities/auto-log', {
        email_address: 'nobody@example.com',
        subject: 'Hello',
        direction: 'inbound',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matched).toBe(false);
    expect(body.activities_created).toBe(0);
  });

  it('creates activities for matched leads', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { activities: { data: null, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);
    mockMatchEmail.mockResolvedValue({
      leads: [{ id: 'lead-1', lead_name: 'Test Lead' }],
      contacts: [],
      accounts: [],
    });

    const res = await POST(
      makeJsonRequest('/api/crm/activities/auto-log', {
        email_address: 'test@example.com',
        subject: 'Project Inquiry',
        direction: 'inbound',
        message_preview: 'Hi, I need a quote...',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matched).toBe(true);
    expect(body.activities_created).toBe(1);
  });

  it('creates activities for matched contacts with accounts', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { activities: { data: null, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);
    mockMatchEmail.mockResolvedValue({
      leads: [],
      contacts: [{ id: 'contact-1', first_name: 'Jane', last_name: 'Doe' }],
      accounts: [{ id: 'acct-1', account_name: 'Acme Corp' }],
    });

    const res = await POST(
      makeJsonRequest('/api/crm/activities/auto-log', {
        email_address: 'jane@acme.com',
        subject: 'Follow-up',
        direction: 'outbound',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matched).toBe(true);
    expect(body.activities_created).toBeGreaterThanOrEqual(1);
  });

  it('handles supabase insert error', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        activities: { data: null, error: { message: 'Insert failed', code: '42000' } },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);
    mockMatchEmail.mockResolvedValue({
      leads: [{ id: 'lead-1', lead_name: 'Test' }],
      contacts: [],
      accounts: [],
    });

    const res = await POST(
      makeJsonRequest('/api/crm/activities/auto-log', {
        email_address: 'test@example.com',
        subject: 'Hello',
        direction: 'inbound',
      }),
    );
    expect(res.status).toBe(500);
  });
});
