import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getKrewpactRoles } from '@/lib/api/org';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { rejectChangeOrder } from '@/lib/services/change-order-workflow';

const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(2000),
});

type RouteContext = { params: Promise<{ id: string; coId: string }> };

const ALLOWED_ROLES = ['platform_admin', 'executive', 'operations_manager', 'project_manager'];

/**
 * POST /api/projects/[id]/change-orders/[coId]/reject
 * Rejects a CO with a mandatory reason.
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
      { error: 'Insufficient permissions to reject change orders' },
      { status: 403 },
    );
  }

  const { coId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await rejectChangeOrder(coId, userId, parsed.data.reason);
    if (!result.success) {
      const status =
        result.code === 'NOT_FOUND' ? 404 : result.code === 'INVALID_STATE' ? 400 : 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }
    return NextResponse.json(result.changeOrder);
  } catch (err) {
    logger.error('CO reject route: unexpected error', { coId, error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
