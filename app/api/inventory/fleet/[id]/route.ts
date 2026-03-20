import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

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
import { decommissionVehicle, updateVehicle } from '@/lib/inventory/fleet';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';
import { createFleetVehicleSchema } from '@/lib/validators/inventory';

type RouteContext = { params: Promise<{ id: string }> };

const updateVehicleSchema = createFleetVehicleSchema.partial();

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
    const { data, error } = await supabase.from('fleet_vehicles').select('*').eq('id', id).single();

    if (error) {
      return errorResponse(
        error.code === 'PGRST116' ? notFound('Fleet vehicle') : dbError(error.message),
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    logger.error('Failed to get fleet vehicle', { error: err, id });
    return errorResponse(dbError('Failed to get fleet vehicle'));
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

  const parsed = updateVehicleSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const vehicle = await updateVehicle(supabase, id, parsed.data);
    return NextResponse.json(vehicle);
  } catch (err: unknown) {
    logger.error('Failed to update fleet vehicle', { error: err, id });
    return errorResponse(dbError('Failed to update fleet vehicle'));
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

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const vehicle = await decommissionVehicle(supabase, id);
    return NextResponse.json(vehicle);
  } catch (err: unknown) {
    logger.error('Failed to decommission fleet vehicle', { error: err, id });
    return errorResponse(dbError('Failed to decommission fleet vehicle'));
  }
}
