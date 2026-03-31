import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/knowledge/embeddings', () => ({ embedChunks: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), child: vi.fn().mockReturnThis() },
}));
vi.mock('@/lib/api/org', () => ({ getKrewpactRoles: vi.fn(), getKrewpactOrgId: vi.fn().mockResolvedValue('test-org-00000000-0000-0000-0000-000000000000') }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/request-context', () => ({
  generateRequestId: vi.fn().mockReturnValue('test-request-id'),
  requestContext: { run: vi.fn().mockImplementation((_ctx, fn) => fn()) },
}));

import { auth } from '@clerk/nextjs/server';

import { POST } from '@/app/api/executive/knowledge/search/route';
import { getKrewpactRoles } from '@/lib/api/org';
import { embedChunks } from '@/lib/knowledge/embeddings';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockEmbedChunks = vi.mocked(embedChunks);
const mockGetKrewpactRoles = vi.mocked(getKrewpactRoles);

function makeRequest(body: unknown) {
  return new NextRequest(new URL('http://localhost/api/executive/knowledge/search'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setupAuth(userId: string | null, roles: string[] = []) {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: userId ? { krewpact_roles: roles } : null,
  } as any as Awaited<ReturnType<typeof auth>>);
  mockGetKrewpactRoles.mockResolvedValue(userId ? roles : []);
}

describe('POST /api/executive/knowledge/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    setupAuth(null);
    const res = await POST(makeRequest({ query: 'test query' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 for non-executive role', async () => {
    setupAuth('user-123', ['project_manager']);
    const res = await POST(makeRequest({ query: 'test query' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 for missing query', async () => {
    setupAuth('user-123', ['executive']);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/query/i);
  });

  it('returns 400 for empty query string', async () => {
    setupAuth('user-123', ['executive']);
    const res = await POST(makeRequest({ query: '   ' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/query/i);
  });

  it('returns 200 with search results', async () => {
    setupAuth('user-123', ['executive']);

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

    mockCreateUserClientSafe.mockResolvedValue({
      client: {
        rpc: mockRpc,
        from: mockFrom,
      } as any,
      error: null,
    });

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
      p_org_id: 'test-org-00000000-0000-0000-0000-000000000000',
    });
  });

  it('respects threshold and limit params', async () => {
    setupAuth('user-123', ['platform_admin']);

    mockEmbedChunks.mockResolvedValue([Array(1536).fill(0.5)]);

    const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

    mockCreateUserClientSafe.mockResolvedValue({
      client: {
        rpc: mockRpc,
        from: vi.fn(),
      } as any,
      error: null,
    });

    const res = await POST(makeRequest({ query: 'test', threshold: 0.9, limit: 25 }));
    expect(res.status).toBe(200);

    expect(mockRpc).toHaveBeenCalledWith('match_knowledge', {
      query_embedding: expect.any(String),
      match_threshold: 0.9,
      match_count: 25,
      p_org_id: 'test-org-00000000-0000-0000-0000-000000000000',
    });
  });

  it('caps limit at 50', async () => {
    setupAuth('user-123', ['executive']);

    mockEmbedChunks.mockResolvedValue([Array(1536).fill(0.5)]);

    const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

    mockCreateUserClientSafe.mockResolvedValue({
      client: {
        rpc: mockRpc,
        from: vi.fn(),
      } as any,
      error: null,
    });

    await POST(makeRequest({ query: 'test', limit: 200 }));

    expect(mockRpc).toHaveBeenCalledWith(
      'match_knowledge',
      expect.objectContaining({ match_count: 50 }),
    );
  });

  it('returns empty results array when no matches', async () => {
    setupAuth('user-123', ['executive']);

    mockEmbedChunks.mockResolvedValue([Array(1536).fill(0.1)]);

    const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null });

    mockCreateUserClientSafe.mockResolvedValue({
      client: {
        rpc: mockRpc,
        from: vi.fn(),
      } as any,
      error: null,
    });

    const res = await POST(makeRequest({ query: 'very obscure query' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.results).toEqual([]);
  });
});
