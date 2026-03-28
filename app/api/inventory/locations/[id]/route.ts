import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { getLocationWithSpots, updateLocation } from '@/lib/inventory/locations';
import { createUserClientSafe } from '@/lib/supabase/server';

const updateLocationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  location_type: z.enum(['warehouse', 'job_site', 'vehicle']).optional(),
  address: z.string().optional(),
  project_id: z.string().uuid().optional().nullable(),
  parent_location_id: z.string().uuid().optional().nullable(),
  linked_vehicle_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const location = await getLocationWithSpots(supabase, id).catch(() => {
    throw dbError('Failed to get location');
  });

  if (!location) throw notFound('Location');

  return NextResponse.json(location);
});

export const PATCH = withApiRoute(
  { bodySchema: updateLocationSchema },
  async ({ body, params }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const location = await updateLocation(supabase, id, body).catch(() => {
      throw dbError('Failed to update location');
    });

    return NextResponse.json(location);
  },
);
