import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe, createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string; msgId: string }> };

async function resolvePortalAccess(
  supabase: Awaited<ReturnType<typeof createUserClient>>,
  userId: string,
  projectId: string,
) {
  const { data: pa } = await supabase
    .from('portal_accounts')
    .select('id, status')
    .eq('clerk_user_id', userId)
    .single();

  if (!pa || pa.status !== 'active') return null;

  const { data: perm } = await supabase
    .from('portal_permissions')
    .select('id')
    .eq('portal_account_id', pa.id)
    .eq('project_id', projectId)
    .single();

  if (!perm) return null;

  return { portalAccountId: pa.id };
}

/**
 * GET /api/portal/projects/[id]/messages/[msgId]
 * Returns a single message and marks it as read.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id: projectId, msgId } = await params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const access = await resolvePortalAccess(supabase, userId, projectId);
  if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const { data, error } = await supabase
    .from('portal_messages')
    .select(
      'id, project_id, sender_id, sender_type, subject, body, is_read, created_at, updated_at',
    )
    .eq('project_id', projectId)
    .eq('id', msgId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  // Mark as read (fire-and-forget)
  if (!data.is_read) {
    await supabase.from('portal_messages').update({ is_read: true }).eq('id', msgId);
  }

  return NextResponse.json(data);
}

/**
 * PATCH /api/portal/projects/[id]/messages/[msgId]
 * Updates the is_read status of a message.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id: projectId, msgId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { is_read } = body as Record<string, unknown>;
  if (typeof is_read !== 'boolean') {
    return NextResponse.json({ error: 'is_read (boolean) is required' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  const access = await resolvePortalAccess(supabase, userId, projectId);
  if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const { data, error } = await supabase
    .from('portal_messages')
    .update({ is_read })
    .eq('project_id', projectId)
    .eq('id', msgId)
    .select(
      'id, project_id, sender_id, sender_type, subject, body, is_read, created_at, updated_at',
    )
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
