/**
 * Cron run logger — records every cron execution to the cron_runs table
 * and sends Sentry cron check-ins for monitoring.
 *
 * Usage:
 *   const cronLog = createCronLogger('scoring', { type: 'crontab', value: '0 * /4 * * *' });
 *   try {
 *     // ... do work ...
 *     await cronLog.success({ processed: 50 });
 *   } catch (err) {
 *     await cronLog.failure(err);
 *     throw err;
 *   }
 */

import * as Sentry from '@sentry/nextjs';

import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

export interface CronSchedule {
  type: 'crontab' | 'interval';
  value: string | number;
  unit?: 'minute' | 'hour' | 'day';
}

export interface CronLogger {
  success(result?: Record<string, unknown>): Promise<void>;
  failure(err: unknown): Promise<void>;
}

export function createCronLogger(cronName: string, schedule?: CronSchedule): CronLogger {
  const startedAt = new Date();

  // Signal to Sentry that this cron is in_progress.
  // Only passes schedule on first call so Sentry auto-creates the monitor.
  let sentryCheckInId: string | undefined;
  try {
    const sentrySchedule =
      schedule !== undefined
        ? schedule.type === 'crontab'
          ? ({ type: 'crontab', value: String(schedule.value) } as const)
          : ({
              type: 'interval',
              value: Number(schedule.value),
              unit: schedule.unit ?? 'minute',
            } as const)
        : undefined;

    sentryCheckInId = Sentry.captureCheckIn(
      {
        monitorSlug: cronName,
        status: 'in_progress',
      },
      sentrySchedule !== undefined ? { schedule: sentrySchedule } : undefined,
    );
  } catch {
    // Missing DSN or network error — never let Sentry break a cron
  }

  async function log(
    status: 'success' | 'failure',
    result?: Record<string, unknown>,
    error?: string,
  ): Promise<void> {
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    // Sentry check-in completion
    try {
      Sentry.captureCheckIn({
        checkInId: sentryCheckInId,
        monitorSlug: cronName,
        status: status === 'success' ? 'ok' : 'error',
        duration: durationMs / 1000,
      });
    } catch {
      // Missing DSN or network error — never let Sentry break a cron
    }

    try {
      const supabase = createServiceClient();
      await supabase.from('cron_runs').insert({
        cron_name: cronName,
        status,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: durationMs,
        result: result ?? {},
        error: error ?? null,
      });
    } catch (logErr) {
      // Never let logging failures break the cron itself
      logger.error('Failed to log cron run', {
        cronName,
        error: logErr instanceof Error ? logErr : undefined,
        errorMessage: String(logErr),
      });
    }
  }

  return {
    async success(result?: Record<string, unknown>) {
      await log('success', result);
    },
    async failure(err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await log('failure', undefined, message);
    },
  };
}
