import { NextResponse } from 'next/server';
import { z } from 'zod';

import { forbidden } from '@/lib/api/errors';
import { getKrewpactRoles, getKrewpactUserId } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createServiceClient } from '@/lib/supabase/server';

const EXECUTIVE_ROLES = ['platform_admin', 'executive'];

const deleteBodySchema = z.object({
  sessionId: z.string().uuid(),
});

export const GET = withApiRoute({}, async ({ orgId }) => {
  const roles = await getKrewpactRoles();
  if (!roles.some((r) => EXECUTIVE_ROLES.includes(r))) {
    throw forbidden('Forbidden');
  }

  const krewpactUserId = await getKrewpactUserId();
  if (!krewpactUserId) {
    return NextResponse.json({ error: 'User identity not found in session' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const { data: sessions, error } = await supabase
    .from('ai_chat_sessions')
    .select('id, title, created_at, context_type')
    .eq('user_id', krewpactUserId)
    .eq('context_type', 'knowledge')
    .eq('org_id', orgId ?? '')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }

  return NextResponse.json({ sessions: sessions ?? [] });
});

export const DELETE = withApiRoute({ bodySchema: deleteBodySchema }, async ({ body, userId, orgId }) => {
  const roles = await getKrewpactRoles();
  if (!roles.some((r) => EXECUTIVE_ROLES.includes(r))) {
    throw forbidden('Forbidden');
  }

  const supabase = await createServiceClient();

  // Verify ownership + org scope before deleting
  const { data: session, error: sessionError } = await supabase
    .from('ai_chat_sessions')
    .select('id, user_id')
    .eq('id', body.sessionId)
    .eq('org_id', orgId ?? '')
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.user_id !== userId) {
    throw forbidden('Forbidden');
  }

  const { error } = await supabase.from('ai_chat_sessions').delete().eq('id', body.sessionId);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
