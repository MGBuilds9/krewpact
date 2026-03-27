import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { costCatalogItemUpdateSchema } from '@/lib/validators/estimating';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('cost_catalog_items')
    .select(
      'id, item_code, item_name, item_type, unit, base_cost, vendor_name, division_id, effective_from, effective_to, metadata, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Cost catalog item');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: costCatalogItemUpdateSchema },
  async ({ params, body }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('cost_catalog_items')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('Cost catalog item');
      throw dbError(error.message);
    }

    return NextResponse.json(data);
  },
);

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('cost_catalog_items').delete().eq('id', id);
  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});
