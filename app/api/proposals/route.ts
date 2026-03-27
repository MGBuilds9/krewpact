import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { proposalCreateSchema } from '@/lib/validators/contracting';

const querySchema = z.object({
  estimate_id: z.string().uuid().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req }) => {
  const { estimate_id, status, limit, offset } = querySchema.parse(
    Object.fromEntries(req.nextUrl.searchParams),
  );

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const effectiveLimit = limit ?? 25;
  const effectiveOffset = offset ?? 0;

  let query = supabase
    .from('proposals')
    /* excluded from list: proposal_payload */
    .select(
      'id, proposal_number, status, estimate_id, sent_at, accepted_at, rejected_at, expires_on, created_by, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(effectiveOffset, effectiveOffset + effectiveLimit - 1);

  if (estimate_id) query = query.eq('estimate_id', estimate_id);
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    hasMore: effectiveOffset + (data?.length ?? 0) < (count ?? 0),
  });
});

export const POST = withApiRoute({ bodySchema: proposalCreateSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { count: existingCount, error: countError } = await supabase
    .from('proposals')
    .select('*', { count: 'exact', head: true });

  if (countError) throw dbError(countError.message);

  const proposal_number = `PROP-${String((existingCount ?? 0) + 1).padStart(5, '0')}`;

  const { data, error } = await supabase
    .from('proposals')
    .insert({ ...body, proposal_number })
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});
