import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';

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
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get('project_id');
  if (!projectId) return NextResponse.json({ error: 'project_id is required' }, { status: 400 });

  const supabase = await createUserClient();
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}

/**
 * POST /api/portals/announcements
 * Publishes a broadcast announcement to all portal accounts on a project.
 * Internal staff only (PM role or above).
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = announcementSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createUserClient();

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
      project_id: parsed.data.project_id,
      portal_account_id: null,
      sender_user_id: internalUser?.id ?? null,
      direction: 'outbound',
      subject: parsed.data.subject,
      body: parsed.data.body,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
