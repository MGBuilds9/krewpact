import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { createUserClientSafe } from '@/lib/supabase/server';

const addSupplierSchema = z.object({
  supplier_id: z.string().uuid(),
  supplier_part_number: z.string().max(100).optional(),
  supplier_price: z.number().min(0).optional(),
  lead_days: z.number().int().min(0).optional(),
  pack_size: z.number().min(0).optional(),
  is_preferred: z.boolean().optional(),
});

export const GET = withApiRoute({}, async ({ params }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const itemId = params.id;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('inventory_item_suppliers')
    .select(
      `
      id,
      item_id,
      supplier_id,
      supplier_part_number,
      supplier_price,
      lead_days,
      pack_size,
      is_preferred,
      created_at,
      updated_at,
      portal_accounts!supplier_id (
        company_name,
        email,
        phone
      )
    `,
    )
    .eq('item_id', itemId)
    .order('is_preferred', { ascending: false });

  if (error) throw dbError('Failed to list item suppliers');

  const suppliers = (data ?? []).map((row) => {
    const account = Array.isArray(row.portal_accounts)
      ? row.portal_accounts[0]
      : row.portal_accounts;
    return {
      id: row.id,
      item_id: row.item_id,
      supplier_id: row.supplier_id,
      company_name: account?.company_name ?? null,
      email: account?.email ?? null,
      phone: account?.phone ?? null,
      supplier_part_number: row.supplier_part_number,
      supplier_price: row.supplier_price,
      lead_days: row.lead_days,
      pack_size: row.pack_size,
      is_preferred: row.is_preferred ?? false,
    };
  });

  return NextResponse.json(suppliers);
});

export const POST = withApiRoute({ bodySchema: addSupplierSchema }, async ({ body, params }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const itemId = params.id;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: item } = await supabase
    .from('inventory_items')
    .select('id')
    .eq('id', itemId)
    .single();
  if (!item) throw notFound('Inventory item');

  const { data, error } = await supabase
    .from('inventory_item_suppliers')
    .insert({ item_id: itemId, ...body })
    .select()
    .single();

  if (error) throw dbError('Failed to add item supplier');

  return NextResponse.json(data, { status: 201 });
});

export const DELETE = withApiRoute({}, async ({ req, params }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const itemId = params.id;
  const supplierId = req.nextUrl.searchParams.get('supplierId');
  if (!supplierId) {
    return NextResponse.json({ error: 'supplierId query param required' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase
    .from('inventory_item_suppliers')
    .delete()
    .eq('item_id', itemId)
    .eq('supplier_id', supplierId);

  if (error) throw dbError('Failed to remove item supplier');

  return new NextResponse(null, { status: 204 });
});
