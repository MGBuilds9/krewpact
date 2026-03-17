/**
 * Cron run logger — records every cron execution to the cron_runs table.
 *
 * Usage:
 *   const cronLog = createCronLogger('scoring');
 *   try {
 *     // ... do work ...
 *     await cronLog.success({ processed: 50 });
 *   } catch (err) {
 *     await cronLog.failure(err);
 *     throw err;
 *   }
 */

import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

export interface CronLogger {
  success(result?: Record<string, unknown>): Promise<void>;
  failure(err: unknown): Promise<void>;
}

export function createCronLogger(cronName: string): CronLogger {
  const startedAt = new Date();

  async function log(
    status: 'success' | 'failure',
    result?: Record<string, unknown>,
    error?: string,
  ): Promise<void> {
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

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
