import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const linkSchema = z.object({
  account_id: z.string().uuid(),
  relationship_type: z.string().min(1).max(100).optional(),
  is_primary: z.boolean().optional(),
});

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('contact_account_links')
    .select(
      'id, contact_id, account_id, relationship_type, is_primary, created_at, account:accounts(id, account_name, account_type, division_id, billing_address, shipping_address, notes, created_by, created_at, updated_at)',
      { count: 'exact' },
    )
    .eq('contact_id', id)
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: linkSchema }, async ({ params, body }) => {
  const { id } = params;
  const { account_id, relationship_type, is_primary } = body as z.infer<typeof linkSchema>;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('contact_account_links')
    .insert({
      contact_id: id,
      account_id,
      relationship_type: relationship_type ?? 'member',
      is_primary: is_primary ?? false,
    })
    .select()
    .single();

  if (error) throw dbError(error.message);

  return NextResponse.json({ data }, { status: 201 });
});

export const DELETE = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const url = new URL(req.url);
  const accountId = url.searchParams.get('account_id');

  if (!accountId) {
    return NextResponse.json({ error: 'account_id query param required' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase
    .from('contact_account_links')
    .delete()
    .eq('contact_id', id)
    .eq('account_id', accountId);

  if (error) throw dbError(error.message);

  return NextResponse.json({ data: { deleted: true } });
});
