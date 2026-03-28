import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { getPaymentHistory } from '@/lib/services/financial-ops';

const FINANCE_ROLES = ['platform_admin', 'executive', 'accounting', 'operations_manager'];

const querySchema = z.object({
  project_id: z.string().uuid(),
});

export const GET = withApiRoute({ querySchema, roles: FINANCE_ROLES }, async ({ query, logger }) => {
  const { project_id } = query as { project_id: string };
  const history = await getPaymentHistory(project_id).catch((err: unknown) => {
    logger.error('GET /api/finance/payment-entries failed', { projectId: project_id, err });
    throw dbError('Failed to fetch payment history');
  });

  return NextResponse.json(history);
});
