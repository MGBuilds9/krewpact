import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { getAgedReceivables } from '@/lib/services/financial-ops';

const FINANCE_ROLES = ['platform_admin', 'executive', 'accounting', 'operations_manager'];

export const GET = withApiRoute({ roles: FINANCE_ROLES }, async ({ orgId, logger }) => {
  if (!orgId) return NextResponse.json({ error: 'Organization context required' }, { status: 500 });

  const report = await getAgedReceivables(orgId).catch((err: unknown) => {
    logger.error('GET /api/finance/aged-receivables failed', { orgId, err });
    throw dbError('Failed to generate aged receivables');
  });

  return NextResponse.json(report);
});
