import { NextResponse } from 'next/server';
import { z } from 'zod';

import { forbidden } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { approveChangeOrder } from '@/lib/services/change-order-workflow';

const approveSchema = z.object({
  comment: z.string().max(1000).optional(),
});

const ALLOWED_ROLES = ['platform_admin', 'executive', 'operations_manager', 'project_manager'];

export const POST = withApiRoute(
  { rateLimit: { limit: 20, window: '1 m' }, bodySchema: approveSchema },
  async ({ params, body, userId }) => {
    const roles = await getKrewpactRoles();
    if (!roles.some((r) => ALLOWED_ROLES.includes(r))) {
      throw forbidden('Insufficient permissions to approve change orders');
    }

    const { coId } = params;
    const result = await approveChangeOrder(coId, userId, body.comment);
    if (!result.success) {
      const status =
        result.code === 'NOT_FOUND' ? 404 : result.code === 'INVALID_STATE' ? 400 : 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }
    return NextResponse.json(result.changeOrder);
  },
);
