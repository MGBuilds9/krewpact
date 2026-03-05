import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { bidLevelingSessionSchema, bidLevelingEntrySchema } from '@/lib/validators/procurement';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(10),
  offset: z.coerce.number().int().nonnegative().default(0),
});

const createSchema = bidLevelingSessionSchema.extend({
  entries: z.array(bidLevelingEntrySchema).min(1),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rfqId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { rfqId } = await params;
  const qp = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(qp);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { limit, offset } = parsed.data;
  const supabase = await createUserClient();
  const { data, error, count } = await supabase
    .from('bid_leveling_sessions')
    .select('*, bid_leveling_entries(*)', { count: 'exact' })
    .eq('rfq_id', rfqId)
    .order('version_no', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rfqId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rfqId } = await params;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createUserClient();

  // Determine next version number
  const { count } = await supabase
    .from('bid_leveling_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('rfq_id', rfqId);

  const versionNo = (count ?? 0) + 1;

  const { data: session, error: sessionError } = await supabase
    .from('bid_leveling_sessions')
    .insert({ notes: parsed.data.notes, rfq_id: rfqId, version_no: versionNo, created_by: userId })
    .select()
    .single();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  const entries = parsed.data.entries.map((e) => ({
    ...e,
    leveling_session_id: session.id,
  }));

  const { error: entriesError } = await supabase.from('bid_leveling_entries').insert(entries);
  if (entriesError) return NextResponse.json({ error: entriesError.message }, { status: 500 });

  return NextResponse.json(session, { status: 201 });
}
