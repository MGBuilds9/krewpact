import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  dbError,
  errorResponse,
  INVALID_JSON,
  UNAUTHORIZED,
  validationError,
} from '@/lib/api/errors';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { createItem, listItems } from '@/lib/inventory/items';
import { logger } from '@/lib/logger';
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
    const result = await listItems(supabase, {
      divisionId: parsed.data.division_id,
      categoryId: parsed.data.category_id,
      trackingType: parsed.data.tracking_type,
      isActive: parsed.data.is_active,
      search: parsed.data.search,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json({
      data: result.data,
      total: result.total,
      hasMore: (parsed.data.offset ?? 0) + result.data.length < result.total,
    });
  } catch (err: unknown) {
    logger.error('Failed to list inventory items', { error: err });
    return errorResponse(dbError('Failed to list inventory items'));
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(INVALID_JSON);
  }

  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const item = await createItem(supabase, { ...parsed.data, created_by: userId });
    return NextResponse.json(item, { status: 201 });
  } catch (err: unknown) {
    logger.error('Failed to create inventory item', { error: err });
    return errorResponse(dbError('Failed to create inventory item'));
  }
}
