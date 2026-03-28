import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { getGoodsReceipt } from '@/lib/inventory/goods-receipts';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const gr = await getGoodsReceipt(supabase, id).catch(() => {
    throw dbError('Failed to get goods receipt');
  });

  if (!gr) throw notFound('Goods receipt');

  return NextResponse.json(gr);
});
