import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError,forbidden, notFound } from '@/lib/api/errors';
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

const patchBodySchema = z.object({
  is_read: z.boolean(),
});

/**
 * GET /api/portal/projects/[id]/messages/[msgId]
 * Returns a single message and marks it as read.
 */
export const GET = withApiRoute({}, async ({ userId, params }) => {
  const { id: projectId, msgId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const access = await resolvePortalAccess(supabase, userId, projectId);
  if (!access) throw forbidden('Access denied');

  const { data, error } = await supabase
    .from('portal_messages')
    .select(
      'id, project_id, sender_id, sender_type, subject, body, is_read, created_at, updated_at',
    )
    .eq('project_id', projectId)
    .eq('id', msgId)
    .single();

  if (error || !data) throw notFound('Message');

  // Mark as read (fire-and-forget)
  if (!data.is_read) {
    await supabase.from('portal_messages').update({ is_read: true }).eq('id', msgId);
  }

  return NextResponse.json(data);
});

/**
 * PATCH /api/portal/projects/[id]/messages/[msgId]
 * Updates the is_read status of a message.
 */
export const PATCH = withApiRoute(
  { rateLimit: { limit: 30, window: '1 m' }, bodySchema: patchBodySchema },
  async ({ userId, params, body }) => {
    const { id: projectId, msgId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const access = await resolvePortalAccess(supabase, userId, projectId);
    if (!access) throw forbidden('Access denied');

    const { data, error } = await supabase
      .from('portal_messages')
      .update({ is_read: body.is_read })
      .eq('project_id', projectId)
      .eq('id', msgId)
      .select(
        'id, project_id, sender_id, sender_type, subject, body, is_read, created_at, updated_at',
      )
      .single();

    if (error || !data) throw notFound('Message');

    return NextResponse.json(data);
  },
);
