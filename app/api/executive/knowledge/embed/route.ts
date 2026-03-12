import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { chunkDocument, embedChunks } from '@/lib/knowledge/embeddings';

export async function POST(req: NextRequest) {
  // Auth: accept QStash signature, bearer token, or admin Clerk session
  const authHeader = req.headers.get('authorization');
  const qstashSignature = req.headers.get('upstash-signature');

  if (!qstashSignature && authHeader !== `Bearer ${process.env.QSTASH_TOKEN}`) {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { getKrewpactRoles } = await import('@/lib/api/org');
    const roles = await getKrewpactRoles();
    if (!roles.includes('platform_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  let body: { stagingId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { stagingId } = body;
  if (!stagingId) {
    return NextResponse.json({ error: 'stagingId is required' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Fetch approved staging doc
  const { data: stagingDoc, error: stagingError } = await supabase
    .from('knowledge_staging')
    .select('*')
    .eq('id', stagingId)
    .eq('status', 'approved')
    .single();

  if (stagingError || !stagingDoc) {
    return NextResponse.json(
      { error: 'Staging document not found or not approved' },
      { status: 404 },
    );
  }

  const content = (stagingDoc.edited_content || stagingDoc.raw_content) as string;
  const filePath = (stagingDoc.source_path as string) || `staging/${stagingId}`;

  // Upsert into knowledge_docs
  const { data: knowledgeDoc, error: upsertError } = await supabase
    .from('knowledge_docs')
    .upsert(
      {
        file_path: filePath,
        title: stagingDoc.title ?? filePath,
        category: stagingDoc.category ?? null,
        division_id: stagingDoc.division_id ?? null,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'file_path' },
    )
    .select()
    .single();

  if (upsertError || !knowledgeDoc) {
    return NextResponse.json({ error: 'Failed to upsert knowledge doc' }, { status: 500 });
  }

  const docId = (knowledgeDoc as { id: string }).id;

  // Delete old embeddings
  await supabase.from('knowledge_embeddings').delete().eq('doc_id', docId);

  // Chunk and embed
  const chunks = chunkDocument(content);
  const embeddings = await embedChunks(chunks);

  // Insert embeddings
  const rows = chunks.map((chunk, i) => ({
    doc_id: docId,
    chunk_index: i,
    content: chunk,
    embedding: JSON.stringify(embeddings[i]),
  }));

  const { error: insertError } = await supabase.from('knowledge_embeddings').insert(rows);

  if (insertError) {
    return NextResponse.json({ error: 'Failed to insert embeddings' }, { status: 500 });
  }

  // Mark staging as ingested
  await supabase.from('knowledge_staging').update({ status: 'ingested' }).eq('id', stagingId);

  return NextResponse.json({ doc_id: docId, chunks: chunks.length });
}
