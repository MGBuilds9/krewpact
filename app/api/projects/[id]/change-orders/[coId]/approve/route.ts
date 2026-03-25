import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { getKrewpactRoles } from '@/lib/api/org';
import { logger } from '@/lib/logger';
import { approveChangeOrder } from '@/lib/services/change-order-workflow';

const approveSchema = z.object({
  comment: z.string().max(1000).optional(),
});

type RouteContext = { params: Promise<{ id: string; coId: string }> };

const ALLOWED_ROLES = ['platform_admin', 'executive', 'operations_manager', 'project_manager'];

/**
 * POST /api/projects/[id]/change-orders/[coId]/approve
 * Approves a CO at its current workflow step (submitted or client_review).
 * Requires project_manager, operations_manager, executive, or platform_admin role.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 20, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const roles = await getKrewpactRoles();
  if (!roles.some((r) => ALLOWED_ROLES.includes(r))) {
    return NextResponse.json({ error: 'Insufficient permissions to approve change orders' }, { status: 403 });
  }

  const { coId } = await context.params;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // comment is optional — empty body is fine
  }

  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await approveChangeOrder(coId, userId, parsed.data.comment);
    if (!result.success) {
      const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'INVALID_STATE' ? 400 : 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }
    return NextResponse.json(result.changeOrder);
  } catch (err) {
    logger.error('CO approve route: unexpected error', { coId, error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
