import { NextRequest, NextResponse } from 'next/server';
import { runPortalReminderJob } from '@/lib/jobs/portalReminders';
import { verifyCronAuth } from '@/lib/api/cron-auth';

/**
 * GET /api/cron/portal-reminders
 * Vercel Cron endpoint — triggered daily.
 */
export async function GET(req: NextRequest) {
  const { authorized } = await verifyCronAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runPortalReminderJob();
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
