import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { dbError, errorResponse, UNAUTHORIZED } from '@/lib/api/errors';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getStockByProject } from '@/lib/inventory/stock-summary';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { projectId } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const result = await getStockByProject(supabase, projectId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    logger.error('Failed to get stock by project', { error: err, projectId });
    return errorResponse(dbError('Failed to get stock by project'));
  }
}
