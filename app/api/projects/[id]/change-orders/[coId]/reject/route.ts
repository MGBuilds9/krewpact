import { NextResponse } from 'next/server';
import { z } from 'zod';

import { forbidden } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { rejectChangeOrder } from '@/lib/services/change-order-workflow';

const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(2000),
});

const ALLOWED_ROLES = ['platform_admin', 'executive', 'operations_manager', 'project_manager'];

export const POST = withApiRoute(
  { rateLimit: { limit: 20, window: '1 m' }, bodySchema: rejectSchema },
  async ({ params, body, userId }) => {
    const roles = await getKrewpactRoles();
    if (!roles.some((r) => ALLOWED_ROLES.includes(r))) {
      throw forbidden('Insufficient permissions to reject change orders');
    }

    const { coId } = params;
    const result = await rejectChangeOrder(coId, userId, body.reason);
    if (!result.success) {
      const status =
        result.code === 'NOT_FOUND' ? 404 : result.code === 'INVALID_STATE' ? 400 : 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }
    return NextResponse.json(result.changeOrder);
  },
);
