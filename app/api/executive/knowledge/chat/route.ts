import { NextRequest, NextResponse } from 'next/server';

import { getKrewpactRoles, getKrewpactUserId } from '@/lib/api/org';
import { embedChunks } from '@/lib/knowledge/embeddings';
import { logger } from '@/lib/logger';
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
    logger.error('Failed to create chat session:', {
      message: error?.message ?? 'No session returned',
    });
    return NextResponse.json({ error: 'Failed to create chat session' }, { status: 500 });
  }
  return newSession.id;
}

async function buildKnowledgeContext(
  supabase: ServiceClient,
  message: string,
): Promise<{ sources: ChatSource[]; contextText: string } | NextResponse> {
  const [queryEmbedding] = await embedChunks([message]);
  const { data: matches, error: rpcError } = await supabase.rpc('match_knowledge', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: 0.5,
    match_count: 5,
  });
  if (rpcError) {
    logger.error('match_knowledge RPC failed:', { message: rpcError.message });
    return NextResponse.json({ error: 'Knowledge search failed' }, { status: 500 });
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
): Promise<{ content: string; totalTokens: number | null } | NextResponse> {
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
    logger.error('OpenAI chat completion failed:', { message: errorText });
    return NextResponse.json({ error: 'AI response generation failed' }, { status: 500 });
  }
  const result = await chatResponse.json();
  return {
    content: result.choices?.[0]?.message?.content ?? 'No response generated.',
    totalTokens: result.usage?.total_tokens ?? null,
  };
}

async function handleChatRequest(
  supabase: ServiceClient,
  sessionId: unknown,
  krewpactUserId: string,
  trimmedMessage: string,
): Promise<NextResponse> {
  const sessionResult = await resolveSessionId(supabase, sessionId, krewpactUserId, trimmedMessage);
  if (sessionResult instanceof NextResponse) return sessionResult;
  const currentSessionId = sessionResult;

  const { data: historyRows } = await supabase
    .from('ai_chat_messages')
    .select('role, content')
    .eq('session_id', currentSessionId)
    .order('created_at', { ascending: true })
    .limit(10);
  const conversationHistory: ChatMessage[] = (historyRows ?? []).map(
    (r: { role: string; content: string }) => ({ role: r.role, content: r.content }),
  );

  const contextResult = await buildKnowledgeContext(supabase, trimmedMessage);
  if (contextResult instanceof NextResponse) return contextResult;
  const { sources, contextText } = contextResult;

  const systemPrompt = contextText
    ? `You are an AI assistant for MDM Group executives. Answer questions using ONLY the provided context from the company knowledge base. If the context doesn't contain enough information, say so clearly.\n\nContext from knowledge base:\n---\n${contextText}\n---\n\nBe concise, accurate, and cite which documents your answer is based on.`
    : `You are an AI assistant for MDM Group executives. No relevant documents were found in the knowledge base for this query. Let the user know and suggest they try rephrasing or ask about a topic covered in the knowledge base.`;

  const aiResult = await callOpenAI(systemPrompt, conversationHistory, trimmedMessage);
  if (aiResult instanceof NextResponse) return aiResult;
  const { content: assistantContent, totalTokens } = aiResult;

  await supabase.from('ai_chat_messages').insert([
    { session_id: currentSessionId, role: 'user', content: trimmedMessage },
    {
      session_id: currentSessionId,
      role: 'assistant',
      content: assistantContent,
      sources: sources.length > 0 ? sources : null,
      token_count: totalTokens,
    },
  ]);

  return NextResponse.json({
    sessionId: currentSessionId,
    message: { role: 'assistant', content: assistantContent, sources },
  });
}

export async function POST(req: NextRequest) {
  const { auth } = await import('@clerk/nextjs/server');
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roles = await getKrewpactRoles();
  if (!roles.some((r) => EXECUTIVE_ROLES.includes(r)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const krewpactUserId = await getKrewpactUserId();
  if (!krewpactUserId)
    return NextResponse.json({ error: 'User identity not found in session' }, { status: 400 });

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

  const supabase = await createServiceClient();
  try {
    return await handleChatRequest(supabase, sessionId, krewpactUserId, message.trim());
  } catch (err: unknown) {
    logger.error('AI chat failed:', { message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
