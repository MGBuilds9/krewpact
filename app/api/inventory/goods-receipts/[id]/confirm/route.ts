import { NextResponse } from 'next/server';

import { serverError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { confirmGoodsReceipt } from '@/lib/inventory/goods-receipts';
import { createUserClientSafe } from '@/lib/supabase/server';

export const POST = withApiRoute({}, async ({ params, userId }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const gr = await confirmGoodsReceipt(supabase, id, userId);
    return NextResponse.json(gr);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to confirm goods receipt';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
