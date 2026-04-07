import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, forbidden } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClient, createUserClientSafe } from '@/lib/supabase/server';

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

const postBodySchema = z.object({
  subject: z.string().optional(),
  message: z.string().min(1),
});

/**
 * GET /api/portal/projects/[id]/messages
 * Returns paginated messages for a portal project.
 * Guard: user must have an active portal account with permission for this project.
 */
export const GET = withApiRoute({}, async ({ req, userId, params }) => {
  const projectId = params.id;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const access = await resolvePortalAccess(supabase, userId, projectId);
  if (!access) throw forbidden('Access denied');

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { data, error, count } = await supabase
    .from('portal_messages')
    .select('id, project_id, sender_id, sender_type, subject, body, is_read, created_at', {
      count: 'exact',
    })
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  // Log the view
  await supabase.from('portal_view_logs').insert({
    project_id: projectId,
    portal_account_id: access.portalAccountId,
    viewed_resource_type: 'messages',
    viewed_resource_id: null,
  });

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

/**
 * POST /api/portal/projects/[id]/messages
 * Creates a new message from a portal user on a project thread.
 * Guard: same portal access check as GET.
 */
export const POST = withApiRoute(
  { rateLimit: { limit: 30, window: '1 m' }, bodySchema: postBodySchema },
  async ({ userId, params, body }) => {
    const projectId = params.id;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const access = await resolvePortalAccess(supabase, userId, projectId);
    if (!access) throw forbidden('Access denied');

    const { data, error } = await supabase
      .from('portal_messages')
      .insert({
        project_id: projectId,
        sender_id: userId,
        sender_type: 'client',
        subject: body.subject ?? null,
        body: body.message,
      })
      .select('id, project_id, sender_id, sender_type, subject, body, is_read, created_at')
      .single();

    if (error) throw dbError(error.message);

    // Fire-and-forget notification to project managers for this project
    try {
      const { data: members } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .in('member_role', ['project_manager', 'project_coordinator']);

      if (members && members.length > 0) {
        await supabase.from('notifications').insert(
          members.map((m) => ({
            user_id: m.user_id,
            type: 'portal_message',
            title: 'New portal message',
            body: `Message on project: ${body.subject ?? '(no subject)'}`,
            data: { project_id: projectId, message_id: data.id },
          })),
        );
      }
    } catch {
      /* fire-and-forget */
    }

    return NextResponse.json(data, { status: 201 });
  },
);
