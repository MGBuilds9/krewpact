import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe, createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

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
 * GET /api/portal/projects/[id]/messages
 * Returns paginated messages for a portal project.
 * Guard: user must have an active portal account with permission for this project.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id: projectId } = await params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const access = await resolvePortalAccess(supabase, userId, projectId);
  if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { data, error, count } = await supabase
    .from('portal_messages')
    .select('id, project_id, sender_id, sender_type, subject, body, is_read, created_at', {
      count: 'exact',
    })
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log the view
  await supabase.from('portal_view_logs').insert({
    project_id: projectId,
    portal_account_id: access.portalAccountId,
    viewed_resource_type: 'messages',
    viewed_resource_id: null,
  });

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}

/**
 * POST /api/portal/projects/[id]/messages
 * Creates a new message from a portal user on a project thread.
 * Guard: same portal access check as GET.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id: projectId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { subject, message } = body as Record<string, unknown>;
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  const access = await resolvePortalAccess(supabase, userId, projectId);
  if (!access) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const { data, error } = await supabase
    .from('portal_messages')
    .insert({
      project_id: projectId,
      sender_id: userId,
      sender_type: 'client',
      subject: typeof subject === 'string' ? subject : null,
      body: message,
    })
    .select('id, project_id, sender_id, sender_type, subject, body, is_read, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire-and-forget notification
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'portal_message',
      title: 'New portal message',
      body: `Message on project: ${typeof subject === 'string' ? subject : '(no subject)'}`,
      data: { project_id: projectId, message_id: data.id },
    });
  } catch {
    /* fire-and-forget */
  }

  return NextResponse.json(data, { status: 201 });
}
