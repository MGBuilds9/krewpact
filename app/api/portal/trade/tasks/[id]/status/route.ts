import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
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
type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

async function resolveTradePortalAccount(supabase: SupabaseClient, userId: string) {
  const { data: pa } = await supabase
    .from('portal_accounts')
    .select('id, status, actor_type')
    .eq('clerk_user_id', userId)
    .single();
  if (!pa || pa.actor_type !== 'trade_partner' || pa.status !== 'active') return null;
  return pa;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id: taskId } = await params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const pa = await resolveTradePortalAccount(supabase, userId);
  if (!pa) return NextResponse.json({ error: 'Trade partner access only' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = taskStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: task } = await supabase
    .from('tasks')
    .select('id, status, metadata')
    .eq('id', taskId)
    .single();
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const metadata = (task.metadata as Record<string, unknown>) ?? {};
  if (metadata.trade_portal_id !== pa.id)
    return NextResponse.json(
      { error: 'This task is not assigned to your account' },
      { status: 403 },
    );
  if (task.status === 'done')
    return NextResponse.json(
      { error: 'Completed tasks cannot be modified via the portal' },
      { status: 400 },
    );

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('tasks')
    .update({
      status: parsed.data.status,
      blocked_reason: parsed.data.blocked_reason ?? null,
      updated_at: now,
      ...(parsed.data.status === 'done' ? { completed_at: now } : {}),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json(updated);
}
