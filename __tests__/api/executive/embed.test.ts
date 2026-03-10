import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Set QSTASH_TOKEN before any imports so the route module reads it
process.env.QSTASH_TOKEN = 'test-qstash-token';

vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }));
vi.mock('@/lib/knowledge/embeddings', () => ({
  chunkDocument: vi.fn(),
  embedChunks: vi.fn(),
}));

import { createServiceClient } from '@/lib/supabase/server';
import { chunkDocument, embedChunks } from '@/lib/knowledge/embeddings';
import { POST } from '@/app/api/executive/knowledge/embed/route';

const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockChunkDocument = vi.mocked(chunkDocument);
const mockEmbedChunks = vi.mocked(embedChunks);

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(new URL('http://localhost/api/executive/knowledge/embed'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/executive/knowledge/embed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    vi.doMock('@clerk/nextjs/server', () => ({
      auth: vi.fn().mockResolvedValue({ userId: null, sessionClaims: null }),
    }));

    const res = await POST(makeRequest({ stagingId: 'abc' }));
    expect(res.status).toBe(401);
  });

  it('returns 404 if staging doc not found', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    };
    mockCreateServiceClient.mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createServiceClient>>,
    );

    const res = await POST(
      makeRequest({ stagingId: 'nonexistent' }, { authorization: 'Bearer test-qstash-token' }),
    );
    expect(res.status).toBe(404);
  });

  it('returns 200 and processes document successfully', async () => {
    const stagingDoc = {
      id: 'staging-1',
      status: 'approved',
      raw_content: 'Document content here.',
      edited_content: null,
      source_path: 'docs/test-doc.md',
      title: 'Test Document',
      category: 'sop',
      division_id: null,
    };

    const knowledgeDoc = {
      id: 'kdoc-1',
      file_path: 'docs/test-doc.md',
    };

    const chunks = ['chunk1 content', 'chunk2 content'];
    const embeddings = [Array(1536).fill(0.1), Array(1536).fill(0.2)];

    mockChunkDocument.mockReturnValue(chunks);
    mockEmbedChunks.mockResolvedValue(embeddings);

    // Build mock supabase chain
    const updateStagingFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const deleteEmbedFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const insertEmbedFn = vi.fn().mockResolvedValue({ error: null });
    const upsertDocFn = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: knowledgeDoc, error: null }),
      }),
    });
    const stagingSingleFn = vi.fn().mockResolvedValue({ data: stagingDoc, error: null });
    const stagingEqStatusFn = vi.fn().mockReturnValue({ single: stagingSingleFn });
    const stagingEqIdFn = vi.fn().mockReturnValue({ eq: stagingEqStatusFn });
    const stagingSelectFn = vi.fn().mockReturnValue({ eq: stagingEqIdFn });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'knowledge_staging') {
          return {
            select: stagingSelectFn,
            update: updateStagingFn,
          };
        }
        if (table === 'knowledge_docs') {
          return { upsert: upsertDocFn };
        }
        if (table === 'knowledge_embeddings') {
          return {
            delete: deleteEmbedFn,
            insert: insertEmbedFn,
          };
        }
        return {};
      }),
    };

    mockCreateServiceClient.mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createServiceClient>>,
    );

    const res = await POST(
      makeRequest({ stagingId: 'staging-1' }, { authorization: 'Bearer test-qstash-token' }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.doc_id).toBe('kdoc-1');
    expect(body.chunks).toBe(2);

    expect(mockChunkDocument).toHaveBeenCalledWith('Document content here.');
    expect(mockEmbedChunks).toHaveBeenCalledWith(chunks);
  });

  it('uses edited_content over raw_content when available', async () => {
    const stagingDoc = {
      id: 'staging-2',
      status: 'approved',
      raw_content: 'Original content.',
      edited_content: 'Edited content.',
      source_path: 'docs/edited-doc.md',
      title: 'Edited Document',
      category: 'strategy',
      division_id: null,
    };

    const knowledgeDoc = { id: 'kdoc-2', file_path: 'docs/edited-doc.md' };

    mockChunkDocument.mockReturnValue(['edited chunk']);
    mockEmbedChunks.mockResolvedValue([[0.1, 0.2]]);

    const updateStagingFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const deleteEmbedFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const insertEmbedFn = vi.fn().mockResolvedValue({ error: null });
    const upsertDocFn = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: knowledgeDoc, error: null }),
      }),
    });
    const stagingSingleFn = vi.fn().mockResolvedValue({ data: stagingDoc, error: null });
    const stagingEqStatusFn = vi.fn().mockReturnValue({ single: stagingSingleFn });
    const stagingEqIdFn = vi.fn().mockReturnValue({ eq: stagingEqStatusFn });
    const stagingSelectFn = vi.fn().mockReturnValue({ eq: stagingEqIdFn });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'knowledge_staging') {
          return { select: stagingSelectFn, update: updateStagingFn };
        }
        if (table === 'knowledge_docs') {
          return { upsert: upsertDocFn };
        }
        if (table === 'knowledge_embeddings') {
          return { delete: deleteEmbedFn, insert: insertEmbedFn };
        }
        return {};
      }),
    };

    mockCreateServiceClient.mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof createServiceClient>>,
    );

    await POST(
      makeRequest({ stagingId: 'staging-2' }, { authorization: 'Bearer test-qstash-token' }),
    );

    expect(mockChunkDocument).toHaveBeenCalledWith('Edited content.');
  });
});
