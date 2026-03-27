import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }));
vi.mock('@/lib/knowledge/embeddings', () => ({ embedChunks: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), child: vi.fn().mockReturnThis() },
}));
vi.mock('@/lib/api/org', () => ({ getKrewpactRoles: vi.fn(), getKrewpactUserId: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/request-context', () => ({
  generateRequestId: vi.fn().mockReturnValue('test-request-id'),
  requestContext: { run: vi.fn().mockImplementation((_ctx, fn) => fn()) },
}));
vi.mock('ai', () => ({
  streamText: vi.fn(),
}));
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn().mockReturnValue('mock-model'),
}));

import { auth } from '@clerk/nextjs/server';
import { streamText } from 'ai';

import { POST } from '@/app/api/executive/knowledge/chat/route';
import { getKrewpactRoles, getKrewpactUserId } from '@/lib/api/org';
import { embedChunks } from '@/lib/knowledge/embeddings';
import { createServiceClient } from '@/lib/supabase/server';

const mockStreamText = vi.mocked(streamText);

const mockAuth = vi.mocked(auth);
const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockEmbedChunks = vi.mocked(embedChunks);
const mockGetKrewpactRoles = vi.mocked(getKrewpactRoles);
const mockGetKrewpactUserId = vi.mocked(getKrewpactUserId);

function makeRequest(body: unknown) {
  return new NextRequest(new URL('http://localhost/api/executive/knowledge/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setupAuth(userId: string | null, roles: string[] = [], krewpactUserId?: string) {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: userId
      ? {
          krewpact_roles: roles,
          krewpact_user_id: krewpactUserId ?? 'user-uuid-123',
        }
      : null,
  } as any as Awaited<ReturnType<typeof auth>>);
  if (userId) {
    mockGetKrewpactRoles.mockResolvedValue(roles);
    mockGetKrewpactUserId.mockResolvedValue(krewpactUserId ?? 'user-uuid-123');
  } else {
    mockGetKrewpactRoles.mockResolvedValue([]);
    mockGetKrewpactUserId.mockResolvedValue(null);
  }
}

describe('POST /api/executive/knowledge/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    setupAuth(null);
    const res = await POST(makeRequest({ message: 'hello' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 for non-executive role', async () => {
    setupAuth('user-123', ['project_manager']);

    const res = await POST(makeRequest({ message: 'hello' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 for missing message', async () => {
    setupAuth('user-123', ['executive']);

    mockCreateServiceClient.mockResolvedValue({
      from: vi.fn(),
      rpc: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createServiceClient>>);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/message/i);
  });

  it('returns 200 with AI response for executive', async () => {
    setupAuth('user-123', ['executive'], 'user-uuid-abc');

    const fakeEmbedding = Array(1536).fill(0.1);
    mockEmbedChunks.mockResolvedValue([fakeEmbedding]);

    const matches = [
      {
        id: 'emb-1',
        doc_id: 'doc-1',
        content: 'SOP content here',
        chunk_index: 0,
        similarity: 0.88,
      },
    ];
    const docs = [{ id: 'doc-1', title: 'Safety SOP' }];
    const newSession = { id: 'session-uuid-1' };

    const mockInsertMessages = vi.fn().mockResolvedValue({ error: null });
    const mockInsertSession = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: newSession, error: null }),
      }),
    });

    const mockFrom = vi.fn((table: string) => {
      if (table === 'ai_chat_sessions') {
        return { insert: mockInsertSession };
      }
      if (table === 'ai_chat_messages') {
        // First call: fetch history — return empty
        // Second call: insert messages
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
          insert: mockInsertMessages,
        };
      }
      if (table === 'knowledge_docs') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: docs, error: null }),
          }),
        };
      }
      return {};
    });

    const mockRpc = vi.fn().mockResolvedValue({ data: matches, error: null });

    mockCreateServiceClient.mockResolvedValue({
      from: mockFrom,
      rpc: mockRpc,
    } as unknown as Awaited<ReturnType<typeof createServiceClient>>);

    mockStreamText.mockReturnValue({
      toTextStreamResponse: vi.fn().mockReturnValue(
        new Response('AI response about safety', {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Session-Id': 'session-uuid-1',
          },
        }),
      ),
    } as any);

    const res = await POST(makeRequest({ message: 'What are our safety procedures?' }));
    expect(res.status).toBe(200);

    // Route returns a text stream, not JSON — verify status and session header
    expect(res.headers.get('X-Session-Id')).toBe('session-uuid-1');

    expect(mockEmbedChunks).toHaveBeenCalledWith(['What are our safety procedures?']);
    expect(mockRpc).toHaveBeenCalledWith('match_knowledge', {
      query_embedding: JSON.stringify(fakeEmbedding),
      match_threshold: 0.5,
      match_count: 5,
    });
  });

  it('reuses existing sessionId when provided', async () => {
    setupAuth('user-123', ['platform_admin'], 'user-uuid-xyz');

    const fakeEmbedding = Array(1536).fill(0.2);
    mockEmbedChunks.mockResolvedValue([fakeEmbedding]);

    const mockInsertMessages = vi.fn().mockResolvedValue({ error: null });

    const mockFrom = vi.fn((table: string) => {
      if (table === 'ai_chat_messages') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
          insert: mockInsertMessages,
        };
      }
      if (table === 'knowledge_docs') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return {};
    });

    mockCreateServiceClient.mockResolvedValue({
      from: mockFrom,
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as unknown as Awaited<ReturnType<typeof createServiceClient>>);

    mockStreamText.mockReturnValue({
      toTextStreamResponse: vi.fn().mockReturnValue(
        new Response('Reused session response', {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Session-Id': 'existing-session-id',
          },
        }),
      ),
    } as any);

    const res = await POST(
      makeRequest({ message: 'Follow-up question', sessionId: 'existing-session-id' }),
    );
    expect(res.status).toBe(200);

    // Route returns a text stream — verify session ID from header
    expect(res.headers.get('X-Session-Id')).toBe('existing-session-id');
  });
});
