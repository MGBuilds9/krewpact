import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { contractTermsCreateSchema } from '@/lib/validators/contracting';

const querySchema = z.object({
  proposal_id: z.string().uuid().optional(),
  contract_status: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req }) => {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const { proposal_id, contract_status, limit, offset } = querySchema.parse(params);
  const effectiveLimit = limit ?? 25;
  const effectiveOffset = offset ?? 0;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('contract_terms')
    .select(
      'id, proposal_id, contract_status, legal_text_version, signed_at, supersedes_contract_id, created_at, updated_at' /* excluded from list: terms_payload */,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (proposal_id) query = query.eq('proposal_id', proposal_id);
  if (contract_status) query = query.eq('contract_status', contract_status);

  query = query.range(effectiveOffset, effectiveOffset + effectiveLimit - 1);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    hasMore: effectiveOffset + (data?.length ?? 0) < (count ?? 0),
  });
});

export const POST = withApiRoute({ bodySchema: contractTermsCreateSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase.from('contract_terms').insert(body).select().single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});
