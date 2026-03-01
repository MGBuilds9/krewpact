import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const taskStatusSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'blocked', 'done']),
  blocked_reason: z.string().max(500).optional(),
});

/**
 * PATCH /api/portal/trade/tasks/[id]/status
 * Allows a trade partner to update the status of one of their assigned tasks.
 * Immutability guard: once 'done', cannot be reverted by trade portal.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;
  const supabase = await createUserClient();

  // Resolve trade portal account
  const { data: pa } = await supabase
    .from('portal_accounts')
    .select('id, status, actor_type')
    .eq('clerk_user_id', userId)
    .single();

  if (!pa || pa.actor_type !== 'trade_partner' || pa.status !== 'active') {
    return NextResponse.json({ error: 'Trade partner access only' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = taskStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Verify this task belongs to this trade portal account
  const { data: task } = await supabase
    .from('tasks')
    .select('id, status, metadata')
    .eq('id', taskId)
    .single();

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const metadata = (task.metadata as Record<string, unknown>) ?? {};
  if (metadata.trade_portal_id !== pa.id) {
    return NextResponse.json({ error: 'This task is not assigned to your account' }, { status: 403 });
  }

  // Immutability: 'done' is terminal for portal users
  if (task.status === 'done') {
    return NextResponse.json({ error: 'Completed tasks cannot be modified via the portal' }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from('tasks')
    .update({
      status: parsed.data.status,
      blocked_reason: parsed.data.blocked_reason ?? null,
      updated_at: new Date().toISOString(),
      ...(parsed.data.status === 'done' ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json(updated);
}
