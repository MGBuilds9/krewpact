import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import { cancelPo } from '@/lib/inventory/purchase-orders';
import { createUserClientSafe } from '@/lib/supabase/server';

export const POST = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const po = await cancelPo(supabase, id);
    return NextResponse.json(po);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel PO';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
