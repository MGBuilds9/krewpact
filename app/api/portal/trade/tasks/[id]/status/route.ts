import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError,forbidden, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const taskStatusSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'blocked', 'done']),
  blocked_reason: z.string().max(500).optional(),
});

/**
 * PATCH /api/portal/trade/tasks/[id]/status
 * Allows a trade partner to update the status of one of their assigned tasks.
 * Immutability guard: once 'done', cannot be reverted by trade portal.
 */
export const PATCH = withApiRoute(
  { bodySchema: taskStatusSchema },
  async ({ userId, params, body }) => {
    const taskId = params.id;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    // Resolve trade partner account
    const { data: pa } = await supabase
      .from('portal_accounts')
      .select('id, status, actor_type')
      .eq('clerk_user_id', userId)
      .single();
    if (!pa || pa.actor_type !== 'trade_partner' || pa.status !== 'active') {
      throw forbidden('Trade partner access only');
    }

    const { data: task } = await supabase
      .from('tasks')
      .select('id, status, metadata')
      .eq('id', taskId)
      .single();
    if (!task) throw notFound('Task');

    const metadata = (task.metadata as Record<string, unknown>) ?? {};
    if (metadata.trade_portal_id !== pa.id) {
      throw forbidden('This task is not assigned to your account');
    }
    if (task.status === 'done') {
      return NextResponse.json(
        { error: 'Completed tasks cannot be modified via the portal' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('tasks')
      .update({
        status: body.status,
        blocked_reason: body.blocked_reason ?? null,
        updated_at: now,
        ...(body.status === 'done' ? { completed_at: now } : {}),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) throw dbError(updateError.message);
    return NextResponse.json(updated);
  },
);
