import { NextRequest, NextResponse } from 'next/server';

import { getKrewpactRoles } from '@/lib/api/org';
import { embedChunks } from '@/lib/knowledge/embeddings';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

const EXECUTIVE_ROLES = ['platform_admin', 'executive'];

interface KnowledgeMatch {
  id: string;
  doc_id: string;
  content: string;
  chunk_index: number;
  similarity: number;
}

interface KnowledgeDoc {
  id: string;
  title: string;
  category: string | null;
  division_id: string | null;
}

function mergeMatchesWithDocs(matches: KnowledgeMatch[], docMap: Map<string, KnowledgeDoc>) {
  return matches.map((match) => {
    const doc = docMap.get(match.doc_id);
    return {
      id: match.id,
      doc_id: match.doc_id,
      title: doc?.title ?? null,
      category: doc?.category ?? null,
      division_id: doc?.division_id ?? null,
      content: match.content,
      chunk_index: match.chunk_index,
      similarity: match.similarity,
    };
  });
}

async function runKnowledgeSearch(
  query: string,
  matchThreshold: number,
  matchCount: number,
): Promise<NextResponse> {
  try {
    const [queryEmbedding] = await embedChunks([query]);
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data: matches, error: rpcError } = await supabase.rpc('match_knowledge', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (rpcError) {
      logger.error('match_knowledge RPC failed:', { message: rpcError.message });
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
    if (!matches?.length) return NextResponse.json({ results: [] });

    const docIds = [...new Set((matches as KnowledgeMatch[]).map((m) => m.doc_id))];
    const { data: docs, error: docsError } = await supabase
      .from('knowledge_docs')
      .select('id, title, category, division_id')
      .in('id', docIds);

    if (docsError) {
      logger.error('knowledge_docs fetch failed:', { message: docsError.message });
      return NextResponse.json({ error: 'Failed to fetch document metadata' }, { status: 500 });
    }

    const docMap = new Map((docs ?? []).map((d: KnowledgeDoc) => [d.id, d]));
    return NextResponse.json({
      results: mergeMatchesWithDocs(matches as KnowledgeMatch[], docMap),
    });
  } catch (err: unknown) {
    logger.error('Knowledge search failed:', {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { auth } = await import('@clerk/nextjs/server');
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roles = await getKrewpactRoles();
  if (!roles.some((r) => EXECUTIVE_ROLES.includes(r)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { query?: unknown; threshold?: unknown; limit?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { query, threshold, limit } = body;
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return NextResponse.json({ error: 'query must be a non-empty string' }, { status: 400 });
  }

  const matchThreshold = typeof threshold === 'number' ? threshold : 0.7;
  const matchCount = typeof limit === 'number' ? Math.min(limit, 50) : 10;
  return runKnowledgeSearch(query.trim(), matchThreshold, matchCount);
}
