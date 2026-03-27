import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { bidLevelingEntrySchema, bidLevelingSessionSchema } from '@/lib/validators/procurement';

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(10),
  offset: z.coerce.number().int().nonnegative().default(0),
});

const createSchema = bidLevelingSessionSchema.extend({
  entries: z.array(bidLevelingEntrySchema).min(1),
});

export const GET = withApiRoute({ querySchema }, async ({ req, params }) => {
  const { rfqId } = params;
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 10);
  const offset = Number(req.nextUrl.searchParams.get('offset') ?? 0);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error, count } = await supabase
    .from('bid_leveling_sessions')
    .select('*, bid_leveling_entries(*)', { count: 'exact' })
    .eq('rfq_id', rfqId)
    .order('version_no', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);
  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});

export const POST = withApiRoute({ bodySchema: createSchema }, async ({ params, body, userId }) => {
  const { rfqId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Determine next version number
  const { count } = await supabase
    .from('bid_leveling_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('rfq_id', rfqId);

  const versionNo = (count ?? 0) + 1;

  const { data: session, error: sessionError } = await supabase
    .from('bid_leveling_sessions')
    .insert({ notes: body.notes, rfq_id: rfqId, version_no: versionNo, created_by: userId })
    .select()
    .single();

  if (sessionError) throw dbError(sessionError.message);

  const entries = body.entries.map((e: Record<string, unknown>) => ({
    ...e,
    leveling_session_id: session.id,
  }));

  const { error: entriesError } = await supabase.from('bid_leveling_entries').insert(entries);
  if (entriesError) throw dbError(entriesError.message);

  return NextResponse.json(session, { status: 201 });
});
