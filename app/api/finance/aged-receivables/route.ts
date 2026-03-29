import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { env } from '@/lib/env';
import { getAgedReceivables } from '@/lib/services/financial-ops';

const FINANCE_ROLES = ['platform_admin', 'executive', 'accounting', 'operations_manager'];

const querySchema = z.object({
  org_id: z.string().uuid().optional(),
});

export const GET = withApiRoute({ querySchema, roles: FINANCE_ROLES }, async ({ query, logger }) => {
  const orgId = (query as { org_id?: string }).org_id ?? env.DEFAULT_ORG_ID;
  if (!orgId) return NextResponse.json({ error: 'DEFAULT_ORG_ID not configured' }, { status: 500 });

  const report = await getAgedReceivables(orgId).catch((err: unknown) => {
    logger.error('GET /api/finance/aged-receivables failed', { orgId, err });
    throw dbError('Failed to generate aged receivables');
  });

  return NextResponse.json(report);
});
