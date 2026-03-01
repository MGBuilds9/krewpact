import { NextResponse } from 'next/server';
import { runPortalReminderJob } from '@/lib/jobs/portalReminders';

/**
 * GET /api/cron/portal-reminders
 * Vercel Cron endpoint — triggered daily.
 * Protected by CRON_SECRET env variable.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
