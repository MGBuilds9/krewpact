import { NextResponse } from 'next/server';

import { dbError, forbidden } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClient, createUserClientSafe } from '@/lib/supabase/server';

async function resolvePortalPermission(
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
    .select('permission_set')
    .eq('portal_account_id', pa.id)
    .eq('project_id', projectId)
    .single();

  if (!perm) return null;

  return {
    portalAccountId: pa.id,
    permSet: (perm.permission_set as Record<string, boolean>) ?? {},
  };
}

/**
 * GET /api/portal/projects/[id]/documents
 * Returns documents that are published to the portal for this project.
 * Permission guard: `view_documents` must be true in permission_set.
 */
export const GET = withApiRoute({}, async ({ req, userId, params }) => {
  const projectId = params.id;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const access = await resolvePortalPermission(supabase, userId, projectId);
  if (!access) throw forbidden('Access denied');

  // Check if document viewing is in permission_set (default to allow if not explicitly set)
  const canViewDocs = access.permSet.view_documents !== false;
  if (!canViewDocs) {
    throw forbidden('Document access not granted for this project');
  }

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  // Fetch only portal-published documents
  const {
    data: documents,
    error,
    count,
  } = await supabase
    .from('file_metadata')
    .select('id, file_name, file_type, file_size_bytes, folder_id, created_at, updated_at', {
      count: 'exact',
    })
    .eq('project_id', projectId)
    .eq('is_portal_shared', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  // Log the view
  await supabase.from('portal_view_logs').insert({
    project_id: projectId,
    portal_account_id: access.portalAccountId,
    viewed_resource_type: 'documents',
    viewed_resource_id: null,
  });

  return NextResponse.json(paginatedResponse(documents, count, limit, offset));
});
