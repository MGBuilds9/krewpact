import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import { submitPo } from '@/lib/inventory/purchase-orders';
import { createUserClientSafe } from '@/lib/supabase/server';

export const POST = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const po = await submitPo(supabase, id);
    return NextResponse.json(po);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit PO';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
