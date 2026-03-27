import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { meetingMinutesSchema } from '@/lib/validators/projects';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error, count } = await supabase
    .from('site_diary_entries')
    .select(
      'id, project_id, entry_at, entry_type, entry_text, created_by, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('project_id', id)
    .eq('entry_type', 'meeting')
    .order('entry_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: meetingMinutesSchema },
  async ({ params, body, userId }) => {
    const { id } = params;
    const { meeting_date, title, attendees, agenda, notes, action_items } = body;

    // Serialize meeting minutes into diary entry_text as structured JSON
    const entryText = JSON.stringify({ title, attendees, agenda, notes, action_items });

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('site_diary_entries')
      .insert({
        project_id: id,
        entry_at: meeting_date,
        entry_type: 'meeting',
        entry_text: entryText,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data, { status: 201 });
  },
);
