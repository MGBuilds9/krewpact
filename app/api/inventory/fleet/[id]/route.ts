import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { decommissionVehicle, updateVehicle } from '@/lib/inventory/fleet';
import { createUserClientSafe } from '@/lib/supabase/server';
import { createFleetVehicleSchema } from '@/lib/validators/inventory';

const updateVehicleSchema = createFleetVehicleSchema.partial();

export const GET = withApiRoute({}, async ({ params }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase.from('fleet_vehicles').select('*').eq('id', id).single();

  if (error) {
    throw error.code === 'PGRST116' ? notFound('Fleet vehicle') : dbError(error.message);
  }

  return NextResponse.json(data);
});

export const PATCH = withApiRoute({ bodySchema: updateVehicleSchema }, async ({ body, params }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const vehicle = await updateVehicle(supabase, id, body).catch(() => {
    throw dbError('Failed to update fleet vehicle');
  });

  return NextResponse.json(vehicle);
});

export const DELETE = withApiRoute({}, async ({ params }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const vehicle = await decommissionVehicle(supabase, id).catch(() => {
    throw dbError('Failed to decommission fleet vehicle');
  });

  return NextResponse.json(vehicle);
});
