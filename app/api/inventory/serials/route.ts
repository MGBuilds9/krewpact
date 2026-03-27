import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { createSerial, listSerials } from '@/lib/inventory/serials';
import { createUserClientSafe } from '@/lib/supabase/server';
import { createSerialSchema } from '@/lib/validators/inventory';

export const GET = withApiRoute({}, async ({ req }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const sp = req.nextUrl.searchParams;

  const result = await listSerials(supabase, {
    divisionId: sp.get('division_id') ?? undefined,
    itemId: sp.get('item_id') ?? undefined,
    status: sp.get('status') ?? undefined,
    locationId: sp.get('location_id') ?? undefined,
    checkedOutTo: sp.get('checked_out_to') ?? undefined,
    search: sp.get('search') ?? undefined,
    limit: sp.has('limit') ? Number(sp.get('limit')) : undefined,
    offset: sp.has('offset') ? Number(sp.get('offset')) : undefined,
  }).catch(() => {
    throw dbError('Failed to list serials');
  });

  return NextResponse.json(result);
});

export const POST = withApiRoute({ bodySchema: createSerialSchema }, async ({ body }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const serial = await createSerial(supabase, body).catch(() => {
    throw dbError('Failed to create serial');
  });

  return NextResponse.json(serial, { status: 201 });
});
