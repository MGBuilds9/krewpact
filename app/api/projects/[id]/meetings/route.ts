import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { meetingMinutesSchema } from '@/lib/validators/projects';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { limit, offset } = parsed.data;
  const effectiveLimit = limit ?? 25;
  const effectiveOffset = offset ?? 0;

  const supabase = await createUserClient();
  const { data, error, count } = await supabase
    .from('site_diary_entries')
    .select('*', { count: 'exact' })
    .eq('project_id', id)
    .eq('entry_type', 'meeting')
    .order('entry_at', { ascending: false })
    .range(effectiveOffset, effectiveOffset + effectiveLimit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    hasMore: (effectiveOffset + (data?.length ?? 0)) < (count ?? 0),
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = meetingMinutesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { meeting_date, title, attendees, agenda, notes, action_items } = parsed.data;

  // Serialize meeting minutes into diary entry_text as structured JSON
  const entryText = JSON.stringify({ title, attendees, agenda, notes, action_items });

  const supabase = await createUserClient();
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
