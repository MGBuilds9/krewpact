import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, errorResponse, UNAUTHORIZED, validationError } from '@/lib/api/errors';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getStockSummary } from '@/lib/inventory/stock-summary';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  division_id: z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  item_id: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const result = await getStockSummary(supabase, {
      divisionId: parsed.data.division_id,
      locationId: parsed.data.location_id,
      itemId: parsed.data.item_id,
      search: parsed.data.search,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({
      data: result.data,
      total: result.total,
    });
  } catch (err: unknown) {
    logger.error('Failed to get stock summary', { error: err });
    return errorResponse(dbError('Failed to get stock summary'));
  }
}
