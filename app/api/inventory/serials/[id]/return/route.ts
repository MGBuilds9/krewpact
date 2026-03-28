import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withApiRoute } from '@/lib/api/with-api-route';
import { returnSerial } from '@/lib/inventory/serials';
import { createUserClientSafe } from '@/lib/supabase/server';

const returnSchema = z.object({
  return_location_id: z.string().uuid(),
  return_spot_id: z.string().uuid().optional(),
  condition_notes: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
});

export const POST = withApiRoute({ bodySchema: returnSchema }, async ({ body, params, userId }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const result = await returnSerial(supabase, id, {
      ...body,
      transacted_by: userId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to return serial';
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
