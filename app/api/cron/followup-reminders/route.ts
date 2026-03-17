import { NextRequest, NextResponse } from 'next/server';

import { verifyCronAuth } from '@/lib/api/cron-auth';
import { createCronLogger } from '@/lib/api/cron-logger';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { authorized } = await verifyCronAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cronLog = createCronLogger('followup-reminders');
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Find all overdue tasks that haven't been notified yet
  const { data: overdueTasks, error } = await supabase
    .from('activities')
    .select('id, title, due_at, owner_user_id, lead_id, opportunity_id, account_id, contact_id')
    .lt('due_at', now)
    .is('completed_at', null)
    .not('owner_user_id', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!overdueTasks || overdueTasks.length === 0) {
    return NextResponse.json({ notified: 0 });
  }

  // Group by user for batch notification
  const byUser = new Map<string, typeof overdueTasks>();
  for (const task of overdueTasks) {
    const userId = task.owner_user_id!;
    const existing = byUser.get(userId) ?? [];
    existing.push(task);
    byUser.set(userId, existing);
  }

  // Create notifications for each user
  const notifications = [];
  for (const [userId, tasks] of byUser) {
    const taskCount = tasks.length;
    const titles = tasks
      .slice(0, 3)
      .map((t) => t.title)
      .join(', ');
    const suffix = taskCount > 3 ? ` and ${taskCount - 3} more` : '';

    notifications.push({
      user_id: userId,
      title: `${taskCount} overdue follow-up${taskCount > 1 ? 's' : ''}`,
      body: `${titles}${suffix}`,
      category: 'followup_reminder',
      link: '/crm/tasks',
    });
  }

  const { error: notifyError } = await supabase.from('notifications').insert(notifications);

  if (notifyError) {
    return NextResponse.json({ error: notifyError.message }, { status: 500 });
  }

  const result = { notified: notifications.length, totalOverdue: overdueTasks.length };
  await cronLog.success(result);
  return NextResponse.json(result);
}

// Vercel Cron Jobs sends GET requests
export { POST as GET };
