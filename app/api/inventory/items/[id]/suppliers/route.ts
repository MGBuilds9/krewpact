import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  dbError,
  errorResponse,
  INVALID_JSON,
  notFound,
  UNAUTHORIZED,
  validationError,
} from '@/lib/api/errors';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

const addSupplierSchema = z.object({
  supplier_id: z.string().uuid(),
  supplier_part_number: z.string().max(100).optional(),
  supplier_price: z.number().min(0).optional(),
  lead_days: z.number().int().min(0).optional(),
  pack_size: z.number().min(0).optional(),
  is_preferred: z.boolean().optional(),
});

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id: itemId } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
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

    if (error) {
      logger.error('Failed to list item suppliers', { error, itemId });
      return errorResponse(dbError('Failed to list item suppliers'));
    }

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
  } catch (err: unknown) {
    logger.error('Failed to list item suppliers', { error: err, itemId });
    return errorResponse(dbError('Failed to list item suppliers'));
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id: itemId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(INVALID_JSON);
  }

  const parsed = addSupplierSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const { data: item } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('id', itemId)
      .single();
    if (!item) return errorResponse(notFound('Inventory item'));

    const { data, error } = await supabase
      .from('inventory_item_suppliers')
      .insert({ item_id: itemId, ...parsed.data })
      .select()
      .single();

    if (error) {
      logger.error('Failed to add item supplier', { error, itemId });
      return errorResponse(dbError('Failed to add item supplier'));
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    logger.error('Failed to add item supplier', { error: err, itemId });
    return errorResponse(dbError('Failed to add item supplier'));
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id: itemId } = await context.params;
  const supplierId = req.nextUrl.searchParams.get('supplierId');
  if (!supplierId) {
    return NextResponse.json({ error: 'supplierId query param required' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const { error } = await supabase
      .from('inventory_item_suppliers')
      .delete()
      .eq('item_id', itemId)
      .eq('supplier_id', supplierId);

    if (error) {
      logger.error('Failed to remove item supplier', { error, itemId, supplierId });
      return errorResponse(dbError('Failed to remove item supplier'));
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    logger.error('Failed to remove item supplier', { error: err, itemId, supplierId });
    return errorResponse(dbError('Failed to remove item supplier'));
  }
}
