import { NextRequest, NextResponse } from 'next/server';

import { verifyCronAuth } from '@/lib/api/cron-auth';
import { createCronLogger } from '@/lib/api/cron-logger';
import { runPortalReminderJob } from '@/lib/jobs/portalReminders';

/**
 * GET /api/cron/portal-reminders
 * Vercel Cron endpoint — triggered daily.
 */
export async function GET(req: NextRequest) {
  const { authorized } = await verifyCronAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cronLog = createCronLogger('portal-reminders');
  try {
    const result = await runPortalReminderJob();
    await cronLog.success(result as Record<string, unknown>);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    await cronLog.failure(err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
