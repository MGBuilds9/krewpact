import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Microsoft Graph client
vi.mock('@/lib/microsoft/graph', () => ({
  getMicrosoftToken: vi.fn(),
  graphFetch: vi.fn(),
  buildGraphUrl: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { getMicrosoftToken, graphFetch, buildGraphUrl } from '@/lib/microsoft/graph';
import { createUserClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/email/send/route';
import {
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  makeJsonRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockGetToken = vi.mocked(getMicrosoftToken);
const mockGraphFetch = vi.mocked(graphFetch);
const mockBuildGraphUrl = vi.mocked(buildGraphUrl);
const mockCreateUserClient = vi.mocked(createUserClient);

function validSendPayload(overrides: Record<string, unknown> = {}) {
  return {
    to: [{ name: 'John Doe', address: 'john@example.com' }],
    subject: 'Test Email',
    body: '<p>Hello</p>',
    ...overrides,
  };
}

// ============================================================
// POST /api/email/send
// ============================================================
describe('POST /api/email/send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildGraphUrl.mockImplementation(
      (path, mailbox) =>
        `https://graph.microsoft.com/v1.0${mailbox ? `/users/${mailbox}` : '/me'}${path}`,
    );
    mockGetToken.mockResolvedValue('mock-ms-token');
    mockGraphFetch.mockResolvedValue(undefined);
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/email/send', validSendPayload()),
    );
    expect(res.status).toBe(401);
  });

  it('sends email successfully', async () => {
    mockClerkAuth(mockAuth);

    const res = await POST(
      makeJsonRequest('/api/email/send', validSendPayload()),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockGraphFetch).toHaveBeenCalledWith(
      'mock-ms-token',
      expect.stringContaining('/sendMail'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns 400 for missing subject', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/email/send', {
        to: [{ address: 'john@example.com' }],
        body: 'content',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty to array', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/email/send', {
        to: [],
        subject: 'Test',
        body: 'content',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email address in to', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/email/send', {
        to: [{ address: 'not-an-email' }],
        subject: 'Test',
        body: 'content',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    mockClerkAuth(mockAuth);
    const req = new Request('http://localhost:3000/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const { NextRequest } = await import('next/server');
    const nextReq = new NextRequest(req);
    const res = await POST(nextReq);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON');
  });

  it('logs CRM activity when leadId is provided', async () => {
    mockClerkAuth(mockAuth);
    const supabase = mockSupabaseClient({
      tables: { activities: { data: null, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(supabase);

    const leadId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const res = await POST(
      makeJsonRequest(
        '/api/email/send',
        validSendPayload({ leadId }),
      ),
    );
    expect(res.status).toBe(200);
    expect(supabase.from).toHaveBeenCalledWith('activities');
  });

  it('logs CRM activity when contactId is provided', async () => {
    mockClerkAuth(mockAuth);
    const supabase = mockSupabaseClient({
      tables: { activities: { data: null, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(supabase);

    const contactId = 'b1ffcd00-9c0b-4ef8-bb6d-6bb9bd380a22';
    const res = await POST(
      makeJsonRequest(
        '/api/email/send',
        validSendPayload({ contactId }),
      ),
    );
    expect(res.status).toBe(200);
    expect(supabase.from).toHaveBeenCalledWith('activities');
  });

  it('logs CRM activity when accountId is provided', async () => {
    mockClerkAuth(mockAuth);
    const supabase = mockSupabaseClient({
      tables: { activities: { data: null, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(supabase);

    const accountId = 'c2aade11-9c0b-4ef8-bb6d-6bb9bd380a33';
    const res = await POST(
      makeJsonRequest(
        '/api/email/send',
        validSendPayload({ accountId }),
      ),
    );
    expect(res.status).toBe(200);
    expect(supabase.from).toHaveBeenCalledWith('activities');
  });

  it('does not log CRM activity when no CRM ids provided', async () => {
    mockClerkAuth(mockAuth);

    const res = await POST(
      makeJsonRequest('/api/email/send', validSendPayload()),
    );
    expect(res.status).toBe(200);
    expect(mockCreateUserClient).not.toHaveBeenCalled();
  });

  it('supports shared mailbox for sending', async () => {
    mockClerkAuth(mockAuth);

    const res = await POST(
      makeJsonRequest(
        '/api/email/send',
        validSendPayload({ mailbox: 'shared@example.com' }),
      ),
    );
    expect(res.status).toBe(200);
    expect(mockBuildGraphUrl).toHaveBeenCalledWith(
      '/sendMail',
      'shared@example.com',
    );
  });

  it('sends with cc recipients', async () => {
    mockClerkAuth(mockAuth);

    const res = await POST(
      makeJsonRequest(
        '/api/email/send',
        validSendPayload({
          cc: [{ name: 'CC Person', address: 'cc@example.com' }],
        }),
      ),
    );
    expect(res.status).toBe(200);
    const callArgs = mockGraphFetch.mock.calls[0];
    const sentBody = JSON.parse((callArgs[2] as RequestInit).body as string);
    expect(sentBody.message.ccRecipients).toHaveLength(1);
    expect(sentBody.message.ccRecipients[0].emailAddress.address).toBe(
      'cc@example.com',
    );
  });

  it('defaults bodyType to HTML', async () => {
    mockClerkAuth(mockAuth);

    const res = await POST(
      makeJsonRequest('/api/email/send', validSendPayload()),
    );
    expect(res.status).toBe(200);
    const callArgs = mockGraphFetch.mock.calls[0];
    const sentBody = JSON.parse((callArgs[2] as RequestInit).body as string);
    expect(sentBody.message.body.contentType).toBe('HTML');
  });
});
