import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getStockSummary } from '@/lib/inventory/stock-summary';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  division_id: z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  item_id: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ query }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const result = await getStockSummary(supabase, {
    divisionId: query.division_id,
    locationId: query.location_id,
    itemId: query.item_id,
    search: query.search,
    limit: query.limit,
    offset: query.offset,
  }).catch(() => {
    throw dbError('Failed to get stock summary');
  });

  return NextResponse.json({
    data: result.data,
    total: result.total,
  });
});
