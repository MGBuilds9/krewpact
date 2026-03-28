import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withApiRoute } from '@/lib/api/with-api-route';
import { checkoutSerial } from '@/lib/inventory/serials';
import { createUserClientSafe } from '@/lib/supabase/server';

const checkoutSchema = z.object({
  checked_out_to: z.string().min(1),
  project_id: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});

export const POST = withApiRoute(
  { bodySchema: checkoutSchema },
  async ({ body, params, userId }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    try {
      const result = await checkoutSerial(supabase, id, {
        ...body,
        transacted_by: userId,
      });
      return NextResponse.json(result, { status: 201 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to checkout serial';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
);
