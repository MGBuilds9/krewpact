import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));
vi.mock('@/lib/knowledge/embeddings', () => ({ embedChunks: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

import { createUserClient } from '@/lib/supabase/server';
import { embedChunks } from '@/lib/knowledge/embeddings';
import { POST } from '@/app/api/executive/knowledge/search/route';

const mockCreateUserClient = vi.mocked(createUserClient);
const mockEmbedChunks = vi.mocked(embedChunks);

function makeRequest(body: unknown) {
  return new NextRequest(new URL('http://localhost/api/executive/knowledge/search'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockAuth(userId: string | null, roles: string[] = []) {
  vi.doMock('@clerk/nextjs/server', () => ({
    auth: vi.fn().mockResolvedValue({
      userId,
      sessionClaims: userId ? { krewpact_roles: roles } : null,
    }),
  }));
}

describe('POST /api/executive/knowledge/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    mockAuth(null);
    const res = await POST(makeRequest({ query: 'test query' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 for non-executive role', async () => {
    mockAuth('user-123', ['project_manager']);
    const res = await POST(makeRequest({ query: 'test query' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 400 for missing query', async () => {
    mockAuth('user-123', ['executive']);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/query/i);
  });

  it('returns 400 for empty query string', async () => {
    mockAuth('user-123', ['executive']);
    const res = await POST(makeRequest({ query: '   ' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/query/i);
  });

  it('returns 200 with search results', async () => {
    mockAuth('user-123', ['executive']);

    const fakeEmbedding = Array(1536).fill(0.1);
    mockEmbedChunks.mockResolvedValue([fakeEmbedding]);

    const matches = [
      {
        id: 'emb-1',
        doc_id: 'doc-1',
        content: 'SOP content here',
        chunk_index: 0,
        similarity: 0.92,
      },
      { id: 'emb-2', doc_id: 'doc-1', content: 'More content', chunk_index: 1, similarity: 0.85 },
    ];

    const docs = [
      { id: 'doc-1', title: 'Safety SOP', category: 'sop', division_id: 'contracting' },
    ];

    const mockRpc = vi.fn().mockResolvedValue({ data: matches, error: null });
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: docs, error: null }),
      }),
    });

    mockCreateUserClient.mockResolvedValue({
      rpc: mockRpc,
      from: mockFrom,
    } as unknown as Awaited<ReturnType<typeof createUserClient>>);

    const res = await POST(makeRequest({ query: 'safety procedures' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.results).toHaveLength(2);
    expect(body.results[0]).toMatchObject({
      id: 'emb-1',
      doc_id: 'doc-1',
      title: 'Safety SOP',
      category: 'sop',
      division_id: 'contracting',
      content: 'SOP content here',
      chunk_index: 0,
      similarity: 0.92,
    });

    expect(mockEmbedChunks).toHaveBeenCalledWith(['safety procedures']);
    expect(mockRpc).toHaveBeenCalledWith('match_knowledge', {
      query_embedding: JSON.stringify(fakeEmbedding),
      match_threshold: 0.7,
      match_count: 10,
    });
  });

  it('respects threshold and limit params', async () => {
    mockAuth('user-123', ['platform_admin']);

    mockEmbedChunks.mockResolvedValue([Array(1536).fill(0.5)]);

    const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

    mockCreateUserClient.mockResolvedValue({
      rpc: mockRpc,
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createUserClient>>);

    const res = await POST(makeRequest({ query: 'test', threshold: 0.9, limit: 25 }));
    expect(res.status).toBe(200);

    expect(mockRpc).toHaveBeenCalledWith('match_knowledge', {
      query_embedding: expect.any(String),
      match_threshold: 0.9,
      match_count: 25,
    });
  });

  it('caps limit at 50', async () => {
    mockAuth('user-123', ['executive']);

    mockEmbedChunks.mockResolvedValue([Array(1536).fill(0.5)]);

    const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

    mockCreateUserClient.mockResolvedValue({
      rpc: mockRpc,
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createUserClient>>);

    await POST(makeRequest({ query: 'test', limit: 200 }));

    expect(mockRpc).toHaveBeenCalledWith(
      'match_knowledge',
      expect.objectContaining({ match_count: 50 }),
    );
  });

  it('returns empty results array when no matches', async () => {
    mockAuth('user-123', ['executive']);

    mockEmbedChunks.mockResolvedValue([Array(1536).fill(0.1)]);

    const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

    mockCreateUserClient.mockResolvedValue({
      rpc: mockRpc,
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createUserClient>>);

    const res = await POST(makeRequest({ query: 'very obscure query' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.results).toEqual([]);
  });
});
