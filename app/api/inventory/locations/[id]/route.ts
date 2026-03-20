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
import { getLocationWithSpots, updateLocation } from '@/lib/inventory/locations';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

const updateLocationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  location_type: z.enum(['warehouse', 'job_site', 'vehicle']).optional(),
  address: z.string().optional(),
  project_id: z.string().uuid().optional().nullable(),
  parent_location_id: z.string().uuid().optional().nullable(),
  linked_vehicle_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const location = await getLocationWithSpots(supabase, id);
    if (!location) return errorResponse(notFound('Location'));
    return NextResponse.json(location);
  } catch (err: unknown) {
    logger.error('Failed to get location', { error: err, id });
    return errorResponse(dbError('Failed to get location'));
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(INVALID_JSON);
  }

  const parsed = updateLocationSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const location = await updateLocation(supabase, id, parsed.data);
    return NextResponse.json(location);
  } catch (err: unknown) {
    logger.error('Failed to update location', { error: err, id });
    return errorResponse(dbError('Failed to update location'));
  }
}
