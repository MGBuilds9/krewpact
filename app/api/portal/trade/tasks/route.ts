import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const taskStatusSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'blocked', 'done']),
  blocked_reason: z.string().optional(),
});

async function resolveActiveTradePartner(userId: string, supabase: Awaited<ReturnType<typeof createUserClient>>) {
  const { data: pa } = await supabase
    .from('portal_accounts')
    .select('id, status, actor_type')
    .eq('clerk_user_id', userId)
    .single();
  if (!pa || pa.actor_type !== 'trade_partner' || pa.status !== 'active') return null;
  return pa;
}

/**
 * GET /api/portal/trade/tasks
 * Returns tasks assigned to this trade partner's account, scoped by portal_permissions.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createUserClient();
  const pa = await resolveActiveTradePartner(userId, supabase);
  if (!pa) return NextResponse.json({ error: 'Trade partner access only' }, { status: 403 });

  const projectId = req.nextUrl.searchParams.get('project_id');

  // Fetch tasks where metadata.trade_portal_id matches this portal account
  let query = supabase
    .from('tasks')
    .select('id, project_id, title, description, status, priority, due_at, blocked_reason, metadata, created_at, updated_at')
    .contains('metadata', { trade_portal_id: pa.id })
    .order('due_at', { ascending: true, nullsFirst: false });

  if (projectId) query = (query as any).eq('project_id', projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tasks: data ?? [] });
}
