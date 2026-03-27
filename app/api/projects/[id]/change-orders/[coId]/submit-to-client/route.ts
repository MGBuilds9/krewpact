import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { getKrewpactRoles } from '@/lib/api/org';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { submitToClient } from '@/lib/services/change-order-workflow';

type RouteContext = { params: Promise<{ id: string; coId: string }> };

const ALLOWED_ROLES = ['platform_admin', 'executive', 'operations_manager', 'project_manager'];

/**
 * POST /api/projects/[id]/change-orders/[coId]/submit-to-client
 * Transitions a submitted CO to client_review, making it visible in the portal.
 * Requires project_manager, operations_manager, executive, or platform_admin role.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 20, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const roles = await getKrewpactRoles();
  if (!roles.some((r) => ALLOWED_ROLES.includes(r))) {
    return NextResponse.json(
      { error: 'Insufficient permissions to submit change orders to client' },
      { status: 403 },
    );
  }

  const { coId } = await context.params;

  try {
    const result = await submitToClient(coId);
    if (!result.success) {
      const status =
        result.code === 'NOT_FOUND' ? 404 : result.code === 'INVALID_STATE' ? 400 : 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }
    return NextResponse.json(result.changeOrder);
  } catch (err) {
    logger.error('CO submit-to-client route: unexpected error', { coId, error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
