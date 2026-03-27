import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { complianceDocCreateSchema } from '@/lib/validators/procurement';

const querySchema = z.object({
  portal_account_id: z.string().uuid().optional(),
  compliance_type: z.string().optional(),
  status: z.enum(['valid', 'expiring', 'expired', 'rejected']).optional(),
  limit: z.coerce.number().int().positive().max(100).default(25),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const GET = withApiRoute({ querySchema }, async ({ req }) => {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const { portal_account_id, compliance_type, status, limit, offset } = querySchema.parse(params);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('trade_partner_compliance_docs')
    .select(
      'id, portal_account_id, compliance_type, file_id, doc_number, issued_on, expires_on, status, verified_by, verified_at, created_at, updated_at',
      { count: 'exact' },
    )
    .order('expires_on', { ascending: true })
    .range(offset, offset + limit - 1);

  if (portal_account_id) query = query.eq('portal_account_id', portal_account_id);
  if (compliance_type) query = query.eq('compliance_type', compliance_type);
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});

export const POST = withApiRoute({ bodySchema: complianceDocCreateSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('trade_partner_compliance_docs')
    .insert({ ...body, status: 'valid' })
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});
