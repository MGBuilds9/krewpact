import { NextResponse } from 'next/server';

import { forbidden } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createServiceClient } from '@/lib/supabase/server';

const EXECUTIVE_ROLES = ['platform_admin', 'executive'];

export const GET = withApiRoute({}, async ({ userId, params }) => {
  const roles = await getKrewpactRoles();
  if (!roles.some((r) => EXECUTIVE_ROLES.includes(r))) {
    throw forbidden('Forbidden');
  }

  const { sessionId } = params;
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Verify the session belongs to the authenticated user
  const { data: session, error: sessionError } = await supabase
    .from('ai_chat_sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.user_id !== userId) {
    throw forbidden('Forbidden');
  }

  const { data: messages, error } = await supabase
    .from('ai_chat_messages')
    .select('id, role, content, sources, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }

  // Convert to useChat initialMessages format (UIMessage compatible)
  const uiMessages = (messages ?? []).map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    parts: [{ type: 'text' as const, text: m.content }],
    createdAt: m.created_at,
    ...(m.role === 'assistant' && m.sources ? { sources: m.sources } : {}),
  }));

  return NextResponse.json({ messages: uiMessages });
});
