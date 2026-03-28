import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createGoodsReceipt, listGoodsReceipts } from '@/lib/inventory/goods-receipts';
import { createUserClientSafe } from '@/lib/supabase/server';
import { createGoodsReceiptSchema } from '@/lib/validators/inventory';

export const GET = withApiRoute({}, async ({ req }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const sp = req.nextUrl.searchParams;

  const result = await listGoodsReceipts(supabase, {
    poId: sp.get('po_id') ?? undefined,
    divisionId: sp.get('division_id') ?? undefined,
    status: sp.get('status') ?? undefined,
    limit: sp.has('limit') ? Number(sp.get('limit')) : undefined,
    offset: sp.has('offset') ? Number(sp.get('offset')) : undefined,
  }).catch(() => {
    throw dbError('Failed to list goods receipts');
  });

  return NextResponse.json(result);
});

export const POST = withApiRoute(
  { bodySchema: createGoodsReceiptSchema },
  async ({ body, userId }) => {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const gr = await createGoodsReceipt(supabase, {
      ...body,
      received_by: userId,
      created_by: userId,
    }).catch(() => {
      throw dbError('Failed to create goods receipt');
    });

    return NextResponse.json(gr, { status: 201 });
  },
);
