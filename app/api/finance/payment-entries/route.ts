import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireRole } from '@/lib/api/org';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { getPaymentHistory } from '@/lib/services/financial-ops';

const FINANCE_ROLES = ['platform_admin', 'executive', 'accounting', 'operations_manager'];

const querySchema = z.object({
  project_id: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  const authResult = await requireRole(FINANCE_ROLES);
  if (authResult instanceof NextResponse) return authResult;
  const { userId } = authResult;

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const history = await getPaymentHistory(parsed.data.project_id);
    return NextResponse.json(history);
  } catch (err: unknown) {
    logger.error('GET /api/finance/payment-entries failed', { projectId: parsed.data.project_id, err });
    return NextResponse.json({ error: 'Failed to fetch payment history' }, { status: 500 });
  }
}
