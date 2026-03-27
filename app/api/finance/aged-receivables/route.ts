import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { getOrgIdFromAuth, requireRole } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { getAgedReceivables } from '@/lib/services/financial-ops';

const FINANCE_ROLES = ['platform_admin', 'executive', 'accounting', 'operations_manager'];

const querySchema = z.object({
  org_id: z.string().uuid().optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ query, logger }) => {
  const authResult = await requireRole(FINANCE_ROLES);
  if (authResult instanceof NextResponse) return authResult;

  const orgId = (query as { org_id?: string }).org_id ?? (await getOrgIdFromAuth());
  if (!orgId) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 });
  }

  const report = await getAgedReceivables(orgId).catch((err: unknown) => {
    logger.error('GET /api/finance/aged-receivables failed', { orgId, err });
    throw dbError('Failed to generate aged receivables');
  });

  return NextResponse.json(report);
});
