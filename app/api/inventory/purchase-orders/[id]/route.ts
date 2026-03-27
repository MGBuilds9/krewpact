import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getPurchaseOrder } from '@/lib/inventory/purchase-orders';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async ({ params }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const po = await getPurchaseOrder(supabase, id).catch(() => {
    throw dbError('Failed to get purchase order');
  });

  if (!po) throw notFound('Purchase order');

  return NextResponse.json(po);
});
