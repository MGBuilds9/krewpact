import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createPurchaseOrder, listPurchaseOrders } from '@/lib/inventory/purchase-orders';
import { createUserClientSafe } from '@/lib/supabase/server';
import { createPurchaseOrderSchema } from '@/lib/validators/inventory';

export const GET = withApiRoute({}, async ({ req }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const sp = req.nextUrl.searchParams;

  const result = await listPurchaseOrders(supabase, {
    divisionId: sp.get('division_id') ?? undefined,
    status: sp.get('status') ?? undefined,
    supplierId: sp.get('supplier_id') ?? undefined,
    search: sp.get('search') ?? undefined,
    limit: sp.has('limit') ? Number(sp.get('limit')) : undefined,
    offset: sp.has('offset') ? Number(sp.get('offset')) : undefined,
  }).catch(() => {
    throw dbError('Failed to list purchase orders');
  });

  return NextResponse.json(result);
});

export const POST = withApiRoute(
  { bodySchema: createPurchaseOrderSchema },
  async ({ body, userId }) => {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const po = await createPurchaseOrder(supabase, {
      ...body,
      created_by: userId,
    }).catch(() => {
      throw dbError('Failed to create purchase order');
    });

    return NextResponse.json(po, { status: 201 });
  },
);
