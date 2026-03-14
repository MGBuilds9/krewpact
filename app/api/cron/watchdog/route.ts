import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { verifyCronAuth } from '@/lib/api/cron-auth';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';

/**
 * Cron Watchdog — checks that all registered crons have run recently.
 * Alerts if any cron hasn't run in 2x its expected interval.
 *
 * Runs every hour.
 */

// Expected cron intervals in minutes
const CRON_SCHEDULE: Record<string, number> = {
  'scoring': 240,               // every 4h
  'enrichment': 1440,           // MWF (worst case: ~48h gap Fri→Mon)
  'apollo-pump': 10080,         // weekly (Monday)
  'sequence-processor': 15,     // every 15min
  'sla-alerts': 1440,           // daily weekdays
  'portal-reminders': 1440,     // daily weekdays
  'summarize': 1440,            // daily weekdays
  'erp-sync': 30,               // every 30min
  'followup-reminders': 1440,   // daily weekdays
  'icp-refresh': 10080,         // weekly (Monday)
  'smoke-test': 15,             // every 15min
};

// 2x multiplier for alerting threshold
const ALERT_MULTIPLIER = 2;

interface WatchdogResult {
  cron_name: string;
  status: 'ok' | 'overdue' | 'never_ran';
  last_run?: string;
  last_status?: string;
  expected_interval_min: number;
  minutes_since_last_run?: number;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { authorized } = await verifyCronAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = Date.now();
  const results: WatchdogResult[] = [];
  const overdue: WatchdogResult[] = [];

  // Get the latest run for each cron
  const { data: allRuns, error } = await supabase
    .from('cron_runs')
    .select('cron_name, status, started_at')
    .order('started_at', { ascending: false })
    .limit(200);

  if (error) {
    logger.error('Watchdog: failed to query cron_runs', { errorMessage: error.message });
    return NextResponse.json({ error: 'Failed to query cron_runs' }, { status: 500 });
  }

  // Group by cron_name, take latest
  const latestRuns = new Map<string, { status: string; started_at: string }>();
  if (allRuns) {
    for (const run of allRuns) {
      if (!latestRuns.has(run.cron_name)) {
        latestRuns.set(run.cron_name, { status: run.status, started_at: run.started_at });
      }
    }
  }

  for (const [cronName, expectedIntervalMin] of Object.entries(CRON_SCHEDULE)) {
    const lastRun = latestRuns.get(cronName);

    if (!lastRun) {
      const result: WatchdogResult = {
        cron_name: cronName,
        status: 'never_ran',
        expected_interval_min: expectedIntervalMin,
      };
      results.push(result);
      // Only alert for never_ran if cron logging has been active for > 1 day
      // (avoids false alarms on first deploy)
      continue;
    }

    const minutesSinceLastRun = Math.round(
      (now - new Date(lastRun.started_at).getTime()) / 60_000,
    );
    const threshold = expectedIntervalMin * ALERT_MULTIPLIER;

    const isOverdue = minutesSinceLastRun > threshold;
    const result: WatchdogResult = {
      cron_name: cronName,
      status: isOverdue ? 'overdue' : 'ok',
      last_run: lastRun.started_at,
      last_status: lastRun.status,
      expected_interval_min: expectedIntervalMin,
      minutes_since_last_run: minutesSinceLastRun,
    };
    results.push(result);

    if (isOverdue) {
      overdue.push(result);
    }
  }

  // Alert if any crons are overdue
  if (overdue.length > 0) {
    logger.warn('Watchdog: overdue crons detected', {
      overdueCount: overdue.length,
      overdue: overdue.map((r) => r.cron_name),
    });

    try {
      const alertEmail = process.env.ALERT_EMAIL ?? 'michael@mdmgroupinc.ca';
      const overdueList = overdue
        .map(
          (r) =>
            `- ${r.cron_name}: last ran ${r.minutes_since_last_run}min ago (expected every ${r.expected_interval_min}min, threshold ${r.expected_interval_min * ALERT_MULTIPLIER}min)`,
        )
        .join('\n');

      await sendEmail({
        to: alertEmail,
        subject: `[KrewPact] Cron Watchdog: ${overdue.length} job(s) overdue`,
        html: `
          <h2>KrewPact Cron Watchdog Alert</h2>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Overdue crons:</strong></p>
          <pre>${overdueList}</pre>
          <p>Check <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.krewpact.com'}/api/health?deep=true">deep health</a> for full status.</p>
        `,
      });
    } catch (err) {
      logger.error('Watchdog: failed to send alert email', {
        error: err instanceof Error ? err : undefined,
      });
    }
  }

  return NextResponse.json({
    success: true,
    total: results.length,
    overdue: overdue.length,
    results,
    timestamp: new Date().toISOString(),
  });
}

export { POST as GET };
