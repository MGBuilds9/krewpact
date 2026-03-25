import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getOrgIdFromAuth } from '@/lib/api/org';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { getAgedReceivables } from '@/lib/services/financial-ops';

const querySchema = z.object({
  org_id: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const orgId = parsed.data.org_id ?? (await getOrgIdFromAuth());
  if (!orgId) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 });
  }

  try {
    const report = await getAgedReceivables(orgId);
    return NextResponse.json(report);
  } catch (err: unknown) {
    logger.error('GET /api/finance/aged-receivables failed', { orgId, err });
    return NextResponse.json({ error: 'Failed to generate aged receivables' }, { status: 500 });
  }
}
