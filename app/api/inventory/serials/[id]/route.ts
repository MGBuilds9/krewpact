import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { dbError, errorResponse, notFound, UNAUTHORIZED } from '@/lib/api/errors';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getSerial, getSerialHistory } from '@/lib/inventory/serials';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const serial = await getSerial(supabase, id);
    if (!serial) return errorResponse(notFound('Serial'));

    const history = await getSerialHistory(supabase, id);

    return NextResponse.json({ ...serial, history });
  } catch (err: unknown) {
    logger.error('Failed to get serial', { error: err, id });
    return errorResponse(dbError('Failed to get serial'));
  }
}
