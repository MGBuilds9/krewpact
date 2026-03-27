import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { createLocation, listLocations } from '@/lib/inventory/locations';
import { createUserClientSafe } from '@/lib/supabase/server';
import { createLocationSchema } from '@/lib/validators/inventory';

const querySchema = z.object({
  division_id: z.string().uuid().optional(),
  location_type: z.enum(['warehouse', 'job_site', 'vehicle']).optional(),
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

  const result = await listLocations(supabase, {
    divisionId: query.division_id,
    locationType: query.location_type,
    isActive: query.is_active,
    search: query.search,
    limit: query.limit,
    offset: query.offset,
  }).catch(() => {
    throw dbError('Failed to list inventory locations');
  });

  return NextResponse.json({
    data: result.data,
    total: result.total,
    hasMore: (query.offset ?? 0) + result.data.length < result.total,
  });
});

export const POST = withApiRoute({ bodySchema: createLocationSchema }, async ({ body }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const location = await createLocation(supabase, body).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Failed to create location';
    throw dbError(message);
  });

  return NextResponse.json(location, { status: 201 });
});
