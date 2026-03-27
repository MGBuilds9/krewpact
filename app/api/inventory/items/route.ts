import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { createItem, listItems } from '@/lib/inventory/items';
import { createUserClientSafe } from '@/lib/supabase/server';
import { createItemSchema } from '@/lib/validators/inventory';

const querySchema = z.object({
  division_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  tracking_type: z.enum(['none', 'serial', 'lot']).optional(),
  is_active: z.coerce.boolean().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ query }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const result = await listItems(supabase, {
    divisionId: query.division_id,
    categoryId: query.category_id,
    trackingType: query.tracking_type,
    isActive: query.is_active,
    search: query.search,
    limit: query.limit,
    offset: query.offset,
  }).catch(() => {
    throw dbError('Failed to list inventory items');
  });

  return NextResponse.json({
    data: result.data,
    total: result.total,
    hasMore: (query.offset ?? 0) + result.data.length < result.total,
  });
});

export const POST = withApiRoute({ bodySchema: createItemSchema }, async ({ body, userId }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const item = await createItem(supabase, { ...body, created_by: userId }).catch(() => {
    throw dbError('Failed to create inventory item');
  });

  return NextResponse.json(item, { status: 201 });
});
