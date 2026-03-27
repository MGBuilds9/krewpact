import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { assemblyItemCreateSchema, assemblyItemUpdateSchema } from '@/lib/validators/estimating';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('assembly_items')
    .select(
      'id, assembly_id, catalog_item_id, line_type, description, quantity, unit_cost, sort_order, metadata, created_at, updated_at, cost_catalog_items(id, item_code, item_name, item_type, unit, base_cost, vendor_name, division_id, effective_from, effective_to, metadata, created_at, updated_at)',
      { count: 'exact' },
    )
    .eq('assembly_id', id)
    .order('sort_order', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: assemblyItemCreateSchema },
  async ({ params, body }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('assembly_items')
      .insert({ ...body, assembly_id: id })
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data, { status: 201 });
  },
);

export const PATCH = withApiRoute(
  { bodySchema: assemblyItemUpdateSchema },
  async ({ req, params, body }) => {
    const { id } = params;
    const itemId = req.nextUrl.searchParams.get('item_id');
    if (!itemId) {
      return NextResponse.json({ error: 'item_id query param required' }, { status: 400 });
    }

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('assembly_items')
      .update(body)
      .eq('id', itemId)
      .eq('assembly_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('Assembly item');
      throw dbError(error.message);
    }

    return NextResponse.json(data);
  },
);

export const DELETE = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const itemId = req.nextUrl.searchParams.get('item_id');
  if (!itemId) {
    return NextResponse.json({ error: 'item_id query param required' }, { status: 400 });
  }

  const querySchema = z.object({ item_id: z.string().uuid() });
  const parsed = querySchema.safeParse({ item_id: itemId });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid item_id' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase
    .from('assembly_items')
    .delete()
    .eq('id', itemId)
    .eq('assembly_id', id);

  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});
