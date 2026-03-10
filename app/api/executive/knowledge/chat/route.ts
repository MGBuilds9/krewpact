import { NextRequest, NextResponse } from 'next/server';
import { embedChunks } from '@/lib/knowledge/embeddings';
import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

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

export async function POST(req: NextRequest) {
  // Auth check
  const { auth } = await import('@clerk/nextjs/server');
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const claims = sessionClaims as Record<string, unknown>;
  const roles = Array.isArray(claims?.krewpact_roles) ? claims.krewpact_roles : [];
  if (!roles.some((r) => EXECUTIVE_ROLES.includes(r as string))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get user_id from JWT claims
  const krewpactUserId = claims?.krewpact_user_id as string | undefined;

  // Parse body
  let body: { message?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, sessionId } = body;

  // Validate message
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'message must be a non-empty string' }, { status: 400 });
  }

  if (!krewpactUserId) {
    return NextResponse.json({ error: 'User identity not found in session' }, { status: 400 });
  }

  const trimmedMessage = message.trim();
  const supabase = createServiceClient();

  try {
    // Resolve or create chat session
    let currentSessionId: string;

    if (sessionId && typeof sessionId === 'string') {
      currentSessionId = sessionId;
    } else {
      // Create new session
      const { data: newSession, error: sessionError } = await supabase
        .from('ai_chat_sessions')
        .insert({
          user_id: krewpactUserId,
          title: trimmedMessage.slice(0, 100),
          context_type: 'knowledge',
        })
        .select('id')
        .single();

      if (sessionError || !newSession) {
        logger.error('Failed to create chat session:', {
          message: sessionError?.message ?? 'No session returned',
        });
        return NextResponse.json({ error: 'Failed to create chat session' }, { status: 500 });
      }

      currentSessionId = newSession.id;
    }

    // Fetch conversation history for context
    const { data: historyRows } = await supabase
      .from('ai_chat_messages')
      .select('role, content')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    const conversationHistory: ChatMessage[] = (historyRows ?? []).map(
      (r: { role: string; content: string }) => ({ role: r.role, content: r.content }),
    );

    // Embed user message
    const [queryEmbedding] = await embedChunks([trimmedMessage]);

    // Search knowledge base
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

    // Fetch doc titles for citations
    const sources: ChatSource[] = [];
    let contextText = '';

    if (knowledgeMatches.length > 0) {
      const docIds = [...new Set(knowledgeMatches.map((m) => m.doc_id))];
      const { data: docs } = await supabase
        .from('knowledge_docs')
        .select('id, title')
        .in('id', docIds);

      const docMap = new Map(((docs ?? []) as KnowledgeDoc[]).map((d) => [d.id, d.title]));

      // Build context + sources
      const contextParts: string[] = [];
      for (const match of knowledgeMatches) {
        const title = docMap.get(match.doc_id) ?? 'Unknown Document';
        contextParts.push(`[${title}]\n${match.content}`);
        sources.push({ doc_id: match.doc_id, title, similarity: match.similarity });
      }
      contextText = contextParts.join('\n\n---\n\n');
    }

    // Build system prompt
    const systemPrompt = contextText
      ? `You are an AI assistant for MDM Group executives. Answer questions using ONLY the provided context from the company knowledge base. If the context doesn't contain enough information, say so clearly.

Context from knowledge base:
---
${contextText}
---

Be concise, accurate, and cite which documents your answer is based on.`
      : `You are an AI assistant for MDM Group executives. No relevant documents were found in the knowledge base for this query. Let the user know and suggest they try rephrasing or ask about a topic covered in the knowledge base.`;

    // Call OpenAI chat completion
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
          ...conversationHistory,
          { role: 'user', content: trimmedMessage },
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

    const chatResult = await chatResponse.json();
    const assistantContent: string =
      chatResult.choices?.[0]?.message?.content ?? 'No response generated.';

    // Save user message + assistant response
    await supabase.from('ai_chat_messages').insert([
      {
        session_id: currentSessionId,
        role: 'user',
        content: trimmedMessage,
      },
      {
        session_id: currentSessionId,
        role: 'assistant',
        content: assistantContent,
        sources: sources.length > 0 ? sources : null,
        token_count: chatResult.usage?.total_tokens ?? null,
      },
    ]);

    return NextResponse.json({
      sessionId: currentSessionId,
      message: {
        role: 'assistant',
        content: assistantContent,
        sources,
      },
    });
  } catch (err: unknown) {
    logger.error('AI chat failed:', {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
