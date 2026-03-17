import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }));
vi.mock('@/lib/knowledge/embeddings', () => ({ embedChunks: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/api/org', () => ({ getKrewpactRoles: vi.fn(), getKrewpactUserId: vi.fn() }));

import { POST } from '@/app/api/executive/knowledge/chat/route';
import { getKrewpactRoles, getKrewpactUserId } from '@/lib/api/org';
import { embedChunks } from '@/lib/knowledge/embeddings';
import { createServiceClient } from '@/lib/supabase/server';

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

function mockAuth(userId: string | null, roles: string[] = [], krewpactUserId?: string) {
  vi.doMock('@clerk/nextjs/server', () => ({
    auth: vi.fn().mockResolvedValue({
      userId,
      sessionClaims: userId
        ? {
            krewpact_roles: roles,
            krewpact_user_id: krewpactUserId ?? 'user-uuid-123',
          }
        : null,
    }),
  }));
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
    mockAuth(null);
    const res = await POST(makeRequest({ message: 'hello' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 for non-executive role', async () => {
    mockAuth('user-123', ['project_manager']);

    // Need a minimal supabase mock so it doesn't crash before role check
    mockCreateServiceClient.mockReturnValue({
      from: vi.fn(),
      rpc: vi.fn(),
    } as unknown as ReturnType<typeof createServiceClient>);

    const res = await POST(makeRequest({ message: 'hello' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 400 for missing message', async () => {
    mockAuth('user-123', ['executive']);

    mockCreateServiceClient.mockReturnValue({
      from: vi.fn(),
      rpc: vi.fn(),
    } as unknown as ReturnType<typeof createServiceClient>);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/message/i);
  });

  it('returns 200 with AI response for executive', async () => {
    mockAuth('user-123', ['executive'], 'user-uuid-abc');

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

    mockCreateServiceClient.mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createServiceClient>);

    // Mock global fetch for OpenAI call
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'AI response about safety' } }],
        usage: { total_tokens: 250 },
      }),
    } as unknown as Response);

    try {
      const res = await POST(makeRequest({ message: 'What are our safety procedures?' }));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.sessionId).toBe('session-uuid-1');
      expect(body.message.role).toBe('assistant');
      expect(body.message.content).toBe('AI response about safety');
      expect(body.message.sources).toHaveLength(1);
      expect(body.message.sources[0]).toMatchObject({
        doc_id: 'doc-1',
        title: 'Safety SOP',
        similarity: 0.88,
      });

      expect(mockEmbedChunks).toHaveBeenCalledWith(['What are our safety procedures?']);
      expect(mockRpc).toHaveBeenCalledWith('match_knowledge', {
        query_embedding: JSON.stringify(fakeEmbedding),
        match_threshold: 0.5,
        match_count: 5,
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('reuses existing sessionId when provided', async () => {
    mockAuth('user-123', ['platform_admin'], 'user-uuid-xyz');

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

    mockCreateServiceClient.mockReturnValue({
      from: mockFrom,
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as unknown as ReturnType<typeof createServiceClient>);

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Reused session response' } }],
        usage: { total_tokens: 100 },
      }),
    } as unknown as Response);

    try {
      const res = await POST(
        makeRequest({ message: 'Follow-up question', sessionId: 'existing-session-id' }),
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      // Should use the provided sessionId, not create a new one
      expect(body.sessionId).toBe('existing-session-id');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
