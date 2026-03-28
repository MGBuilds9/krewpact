import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { getSerial, getSerialHistory } from '@/lib/inventory/serials';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const serial = await getSerial(supabase, id).catch(() => {
    throw dbError('Failed to get serial');
  });

  if (!serial) throw notFound('Serial');

  const history = await getSerialHistory(supabase, id).catch(() => {
    throw dbError('Failed to get serial history');
  });

  return NextResponse.json({ ...serial, history });
});
