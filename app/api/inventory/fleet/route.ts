import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createVehicle, listVehicles } from '@/lib/inventory/fleet';
import { createUserClientSafe } from '@/lib/supabase/server';
import { createFleetVehicleSchema } from '@/lib/validators/inventory';

const querySchema = z.object({
  division_id: z.string().uuid().optional(),
  vehicle_type: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'decommissioned']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const createBodySchema = createFleetVehicleSchema.extend({
  auto_create_location: z.boolean().optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ query }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const result = await listVehicles(supabase, {
    divisionId: query.division_id,
    vehicleType: query.vehicle_type,
    status: query.status,
    search: query.search,
    limit: query.limit,
    offset: query.offset,
  }).catch(() => {
    throw dbError('Failed to list fleet vehicles');
  });

  return NextResponse.json({
    data: result.data,
    total: result.total,
    hasMore: (query.offset ?? 0) + result.data.length < result.total,
  });
});

export const POST = withApiRoute({ bodySchema: createBodySchema }, async ({ body }) => {
  const { auto_create_location, ...vehicleData } = body;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const result = await createVehicle(supabase, vehicleData, auto_create_location).catch(() => {
    throw dbError('Failed to create fleet vehicle');
  });

  return NextResponse.json(result, { status: 201 });
});
