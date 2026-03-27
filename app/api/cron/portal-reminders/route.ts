/**
 * GET /api/cron/portal-reminders
 * Vercel Cron endpoint — triggered daily.
 */

import { NextResponse } from 'next/server';

import { createCronLogger } from '@/lib/api/cron-logger';
import { withApiRoute } from '@/lib/api/with-api-route';
import { runPortalReminderJob } from '@/lib/jobs/portalReminders';

export const GET = withApiRoute({ auth: 'cron' }, async () => {
  const cronLog = createCronLogger('portal-reminders');
  const result = await runPortalReminderJob();
  await cronLog.success(result as Record<string, unknown>);
  return NextResponse.json({ success: true, ...result });
});
