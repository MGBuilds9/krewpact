import { NextResponse } from 'next/server';

import { forbidden } from '@/lib/api/errors';
import { getKrewpactRoles, getKrewpactUserId } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { embedChunks } from '@/lib/knowledge/embeddings';
import { createServiceClient } from '@/lib/supabase/server';

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
}

interface ChatSource {
  doc_id: string;
  title: string;
  similarity: number;
}

interface ChatMessage {
  role: string;
  content: string;
}

type ServiceClient = ReturnType<typeof createServiceClient>;

async function resolveSessionId(
  supabase: ServiceClient,
  sessionId: unknown,
  krewpactUserId: string,
  firstMessage: string,
): Promise<string | NextResponse> {
  if (sessionId && typeof sessionId === 'string') return sessionId;
  const { data: newSession, error } = await supabase
    .from('ai_chat_sessions')
    .insert({
      user_id: krewpactUserId,
      title: firstMessage.slice(0, 100),
      context_type: 'knowledge',
    })
    .select('id')
    .single();
  if (error || !newSession) {
    throw new Error('Failed to create chat session');
  }
  return newSession.id;
}

async function buildKnowledgeContext(
  supabase: ServiceClient,
  message: string,
): Promise<{ sources: ChatSource[]; contextText: string }> {
  const [queryEmbedding] = await embedChunks([message]);
  const { data: matches, error: rpcError } = await supabase.rpc('match_knowledge', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: 0.5,
    match_count: 5,
  });
  if (rpcError) {
    throw new Error('Knowledge search failed');
  }

  const knowledgeMatches = (matches ?? []) as KnowledgeMatch[];
  const sources: ChatSource[] = [];
  let contextText = '';

  if (knowledgeMatches.length > 0) {
    const docIds = [...new Set(knowledgeMatches.map((m) => m.doc_id))];
    const { data: docs } = await supabase
      .from('knowledge_docs')
      .select('id, title')
      .in('id', docIds);
    const docMap = new Map(((docs ?? []) as KnowledgeDoc[]).map((d) => [d.id, d.title]));
    const parts: string[] = [];
    knowledgeMatches.forEach((match) => {
      const title = docMap.get(match.doc_id) ?? 'Unknown Document';
      parts.push(`[${title}]\n${match.content}`);
      sources.push({ doc_id: match.doc_id, title, similarity: match.similarity });
    });
    contextText = parts.join('\n\n---\n\n');
  }
  return { sources, contextText };
}

async function callOpenAI(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
): Promise<{ content: string; totalTokens: number | null }> {
  const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });
  if (!chatResponse.ok) {
    const errorText = await chatResponse.text();
    throw new Error(`OpenAI chat completion failed: ${errorText}`);
  }
  const result = await chatResponse.json();
  return {
    content: result.choices?.[0]?.message?.content ?? 'No response generated.',
    totalTokens: result.usage?.total_tokens ?? null,
  };
}

export const POST = withApiRoute({}, async ({ req, logger }) => {
  const roles = await getKrewpactRoles();
  if (!roles.some((r) => EXECUTIVE_ROLES.includes(r))) {
    throw forbidden('Forbidden');
  }

  const krewpactUserId = await getKrewpactUserId();
  if (!krewpactUserId) {
    return NextResponse.json({ error: 'User identity not found in session' }, { status: 400 });
  }

  let body: { message?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, sessionId } = body;
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'message must be a non-empty string' }, { status: 400 });
  }

  const trimmedMessage = message.trim();
  const supabase = await createServiceClient();

  const resolvedSessionId = await resolveSessionId(
    supabase,
    sessionId,
    krewpactUserId,
    trimmedMessage,
  );
  if (resolvedSessionId instanceof NextResponse) return resolvedSessionId;

  const { data: historyRows } = await supabase
    .from('ai_chat_messages')
    .select('role, content')
    .eq('session_id', resolvedSessionId)
    .order('created_at', { ascending: true })
    .limit(10);
  const conversationHistory: ChatMessage[] = (historyRows ?? []).map(
    (r: { role: string; content: string }) => ({ role: r.role, content: r.content }),
  );

  const { sources, contextText } = await buildKnowledgeContext(supabase, trimmedMessage);

  const systemPrompt = contextText
    ? `You are an AI assistant for MDM Group executives. Answer questions using ONLY the provided context from the company knowledge base. If the context doesn't contain enough information, say so clearly.\n\nContext from knowledge base:\n---\n${contextText}\n---\n\nBe concise, accurate, and cite which documents your answer is based on.`
    : `You are an AI assistant for MDM Group executives. No relevant documents were found in the knowledge base for this query. Let the user know and suggest they try rephrasing or ask about a topic covered in the knowledge base.`;

  const { content: assistantContent, totalTokens } = await callOpenAI(
    systemPrompt,
    conversationHistory,
    trimmedMessage,
  );

  await supabase.from('ai_chat_messages').insert([
    { session_id: resolvedSessionId, role: 'user', content: trimmedMessage },
    {
      session_id: resolvedSessionId,
      role: 'assistant',
      content: assistantContent,
      sources: sources.length > 0 ? sources : null,
      token_count: totalTokens,
    },
  ]);

  return NextResponse.json({
    sessionId: resolvedSessionId,
    message: { role: 'assistant', content: assistantContent, sources },
  });
});
