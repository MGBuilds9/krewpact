import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { forbidden, serverError } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';

const ALLOWED_ROLES = ['platform_admin'];

const CANONICAL_ROLES = [
  'platform_admin',
  'executive',
  'operations_manager',
  'project_manager',
  'project_coordinator',
  'estimator',
  'field_supervisor',
  'accounting',
  'payroll_admin',
  'client_owner',
  'client_delegate',
  'trade_partner_admin',
  'trade_partner_user',
] as const;

const assignSchema = z.object({
  user_id: z.string().min(1),
  role_keys: z.array(z.enum(CANONICAL_ROLES)).min(0),
});

export const POST = withApiRoute(
  {
    rateLimit: { limit: 20, window: '1 m' },
    bodySchema: assignSchema,
  },
  async ({ body, userId, logger: reqLogger }) => {
    const roles = await getKrewpactRoles();
    if (!roles.some((r) => ALLOWED_ROLES.includes(r))) {
      throw forbidden('Forbidden');
    }

    const { user_id, role_keys } = body;

    try {
      const client = await clerkClient();
      const targetUser = await client.users.getUser(user_id);

      const currentMeta = (targetUser.publicMetadata ?? {}) as Record<string, unknown>;
      await client.users.updateUserMetadata(user_id, {
        publicMetadata: { ...currentMeta, role_keys },
      });

      reqLogger.info('User roles updated', {
        target_user_id: user_id,
        role_keys,
        updated_by: userId,
      });

      return NextResponse.json({
        ok: true,
        user_id,
        role_keys,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update roles';
      logger.error('Failed to update Clerk user roles', {
        target_user_id: user_id,
        error: err instanceof Error ? err : undefined,
      });
      throw serverError(message);
    }
  },
);
