import { NextResponse } from 'next/server';
import { z } from 'zod';

import { serverError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { CANONICAL_ROLE_KEYS } from '@/lib/rbac/role-registry';
import { syncRolesToBothStores } from '@/lib/rbac/sync-roles';
import { createServiceClient } from '@/lib/supabase/server';

const assignSchema = z.object({
  user_id: z.string().min(1),
  role_keys: z.array(z.enum(CANONICAL_ROLE_KEYS)).min(0),
  division_ids: z.array(z.string().uuid()).optional(),
});

export const POST = withApiRoute(
  {
    roles: ['platform_admin'],
    rateLimit: { limit: 20, window: '1 m' },
    bodySchema: assignSchema,
  },
  async ({ body, userId, logger: reqLogger }) => {
    const { user_id: clerkUserId, role_keys, division_ids } = body;

    try {
      // Look up Supabase user by clerk_user_id
      const db = createServiceClient();
      const { data: supabaseUser, error: lookupError } = await db
        .from('users')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .single();

      if (lookupError || !supabaseUser) {
        throw new Error(`User not found in Supabase for clerk_user_id: ${clerkUserId}`);
      }

      const result = await syncRolesToBothStores({
        supabaseUserId: supabaseUser.id,
        clerkUserId,
        roleKeys: [...role_keys],
        divisionIds: division_ids,
        assignedBy: userId,
      });

      if (!result.success) {
        reqLogger.warn('Partial role sync', {
          target_user_id: clerkUserId,
          errors: result.errors,
        });
      }

      reqLogger.info('User roles updated', {
        target_user_id: clerkUserId,
        role_keys,
        updated_by: userId,
      });

      return NextResponse.json({
        ok: true,
        user_id: clerkUserId,
        role_keys,
        division_ids: division_ids ?? [],
        sync_errors: result.errors,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update roles';
      logger.error('Failed to update user roles', {
        target_user_id: clerkUserId,
        error: err instanceof Error ? err : undefined,
      });
      throw serverError(message);
    }
  },
);
