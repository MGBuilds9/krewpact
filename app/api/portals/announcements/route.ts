import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const announcementSchema = z.object({
  project_id: z.string().uuid(),
  subject: z.string().min(1).max(120),
  body: z.string().min(1).max(5000),
});

/**
 * GET /api/portals/announcements
 * Returns all announcements (broadcast messages) for a project.
 * Portal users scoped to their assigned projects. Internal staff see all.
 */
export const GET = withApiRoute({}, async ({ req }) => {
  const projectId = req.nextUrl.searchParams.get('project_id');
  if (!projectId) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  // Announcements are portal_messages where portal_account_id IS NULL (broadcast)
  const { data, error, count } = await supabase
    .from('portal_messages')
    .select('id, project_id, subject, body, direction, created_at', { count: 'exact' })
    .eq('project_id', projectId)
    .is('portal_account_id', null)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);
  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

/**
 * POST /api/portals/announcements
 * Publishes a broadcast announcement to all portal accounts on a project.
 * Internal staff only (PM role or above).
 */
export const POST = withApiRoute({ bodySchema: announcementSchema }, async ({ userId, body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Resolve internal user
  const { data: internalUser } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  // Broadcast: portal_account_id = null means it goes to ALL portal accounts on this project
  const { data, error } = await supabase
    .from('portal_messages')
    .insert({
      project_id: body.project_id,
      portal_account_id: null,
      sender_user_id: internalUser?.id ?? null,
      direction: 'outbound',
      subject: body.subject,
      body: body.body,
    })
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});
