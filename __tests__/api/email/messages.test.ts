import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { auth } from '@clerk/nextjs/server';

import { makeRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';
import { GET as GET_BY_ID } from '@/app/api/email/messages/[id]/route';
import { GET } from '@/app/api/email/messages/route';
import { buildGraphUrl, getMicrosoftToken, graphFetch } from '@/lib/microsoft/graph';
import type { GraphListResponse, GraphMessage } from '@/lib/microsoft/types';

const mockAuth = vi.mocked(auth);
const mockGetToken = vi.mocked(getMicrosoftToken);
const mockGraphFetch = vi.mocked(graphFetch);
const mockBuildGraphUrl = vi.mocked(buildGraphUrl);

function makeGraphMessage(overrides: Partial<GraphMessage> = {}): GraphMessage {
  return {
    id: 'msg-001',
    subject: 'Test Subject',
    bodyPreview: 'Hello world...',
    from: { emailAddress: { name: 'Sender', address: 'sender@example.com' } },
    toRecipients: [{ emailAddress: { name: 'Recipient', address: 'recipient@example.com' } }],
    receivedDateTime: '2026-02-24T10:00:00Z',
    sentDateTime: '2026-02-24T09:59:00Z',
    isRead: false,
    hasAttachments: false,
    importance: 'normal',
    webLink: 'https://outlook.office.com/mail/msg-001',
    conversationId: 'conv-001',
    ...overrides,
  };
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ============================================================
// GET /api/email/messages
// ============================================================
describe('GET /api/email/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildGraphUrl.mockImplementation(
      (path, mailbox) =>
        `https://graph.microsoft.com/v1.0${mailbox ? `/users/${mailbox}` : '/me'}${path}`,
    );
    mockGetToken.mockResolvedValue('mock-ms-token');
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/email/messages'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns inbox messages with defaults', async () => {
    const messages: GraphListResponse<GraphMessage> = {
      value: [makeGraphMessage(), makeGraphMessage({ id: 'msg-002' })],
    };
    mockClerkAuth(mockAuth);
    mockGraphFetch.mockResolvedValue(messages);

    const res = await GET(makeRequest('/api/email/messages'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.value).toHaveLength(2);
    expect(mockGetToken).toHaveBeenCalledWith('user_test_123');
    expect(mockBuildGraphUrl).toHaveBeenCalledWith(
      expect.stringContaining('/mailFolders/inbox/messages'),
      undefined,
    );
  });

  it('supports shared mailbox parameter', async () => {
    const messages: GraphListResponse<GraphMessage> = { value: [] };
    mockClerkAuth(mockAuth);
    mockGraphFetch.mockResolvedValue(messages);

    const res = await GET(makeRequest('/api/email/messages?mailbox=shared@example.com'));
    expect(res.status).toBe(200);
    expect(mockBuildGraphUrl).toHaveBeenCalledWith(
      expect.stringContaining('/mailFolders/inbox/messages'),
      'shared@example.com',
    );
  });

  it('passes search parameter to Graph API', async () => {
    const messages: GraphListResponse<GraphMessage> = { value: [] };
    mockClerkAuth(mockAuth);
    mockGraphFetch.mockResolvedValue(messages);

    const res = await GET(makeRequest('/api/email/messages?search=invoice'));
    expect(res.status).toBe(200);
    expect(mockBuildGraphUrl).toHaveBeenCalledWith(expect.stringContaining('%24search'), undefined);
  });

  it('validates top parameter max', async () => {
    mockClerkAuth(mockAuth);
    const res = await GET(makeRequest('/api/email/messages?top=999'));
    expect(res.status).toBe(400);
  });

  it('validates folder enum', async () => {
    mockClerkAuth(mockAuth);
    const res = await GET(makeRequest('/api/email/messages?folder=trash'));
    expect(res.status).toBe(400);
  });

  it('uses sentitems folder when specified', async () => {
    const messages: GraphListResponse<GraphMessage> = { value: [] };
    mockClerkAuth(mockAuth);
    mockGraphFetch.mockResolvedValue(messages);

    const res = await GET(makeRequest('/api/email/messages?folder=sentitems'));
    expect(res.status).toBe(200);
    expect(mockBuildGraphUrl).toHaveBeenCalledWith(
      expect.stringContaining('/mailFolders/sentitems/messages'),
      undefined,
    );
  });

  it('applies pagination parameters', async () => {
    const messages: GraphListResponse<GraphMessage> = { value: [] };
    mockClerkAuth(mockAuth);
    mockGraphFetch.mockResolvedValue(messages);

    const res = await GET(makeRequest('/api/email/messages?top=10&skip=20'));
    expect(res.status).toBe(200);
    expect(mockBuildGraphUrl).toHaveBeenCalledWith(expect.stringMatching(/%24top=10/), undefined);
    expect(mockBuildGraphUrl).toHaveBeenCalledWith(expect.stringMatching(/%24skip=20/), undefined);
  });
});

// ============================================================
// GET /api/email/messages/[id]
// ============================================================
describe('GET /api/email/messages/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildGraphUrl.mockImplementation(
      (path, mailbox) =>
        `https://graph.microsoft.com/v1.0${mailbox ? `/users/${mailbox}` : '/me'}${path}`,
    );
    mockGetToken.mockResolvedValue('mock-ms-token');
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_BY_ID(makeRequest('/api/email/messages/msg-001'), makeContext('msg-001'));
    expect(res.status).toBe(401);
  });

  it('returns single message by id', async () => {
    const message = makeGraphMessage({ id: 'msg-001' });
    mockClerkAuth(mockAuth);
    mockGraphFetch.mockResolvedValue(message);

    const res = await GET_BY_ID(makeRequest('/api/email/messages/msg-001'), makeContext('msg-001'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('msg-001');
    expect(mockBuildGraphUrl).toHaveBeenCalledWith('/messages/msg-001', undefined);
  });

  it('supports shared mailbox for single message', async () => {
    const message = makeGraphMessage();
    mockClerkAuth(mockAuth);
    mockGraphFetch.mockResolvedValue(message);

    const res = await GET_BY_ID(
      makeRequest('/api/email/messages/msg-001?mailbox=shared@example.com'),
      makeContext('msg-001'),
    );
    expect(res.status).toBe(200);
    expect(mockBuildGraphUrl).toHaveBeenCalledWith('/messages/msg-001', 'shared@example.com');
  });
});
