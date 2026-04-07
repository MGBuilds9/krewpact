import { NextResponse } from 'next/server';

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

/**
 * GET /api/portal/projects/[id]/meetings
 * Returns portal-published meeting notes (read-only).
 * Guard: active portal account with permission for this project.
 */
export const GET = withApiRoute({}, async ({ req, userId, params }) => {
  const projectId = params.id;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const access = await resolvePortalAccess(supabase, userId, projectId);
  if (!access) throw forbidden('Access denied');

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { data, error, count } = await supabase
    .from('meeting_notes')
    .select('id, title, meeting_date, attendees, summary, action_items, created_at', {
      count: 'exact',
    })
    .eq('project_id', projectId)
    .eq('is_portal_shared', true)
    .order('meeting_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  await supabase.from('portal_view_logs').insert({
    project_id: projectId,
    portal_account_id: access.portalAccountId,
    viewed_resource_type: 'meetings',
    viewed_resource_id: null,
  });

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});
