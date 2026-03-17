import { NextRequest } from 'next/server';

import { logger } from '@/lib/logger';
import { verifyQStashSignature } from '@/lib/queue/verify';

/**
 * Unified cron route authentication.
 * 1. Try QStash signature verification (for QStash-triggered calls)
 * 2. Fall back to Bearer CRON_SECRET (for Vercel Cron)
 */
export async function verifyCronAuth(
  req: NextRequest,
): Promise<{ authorized: boolean; body?: string }> {
  const qstashSig = req.headers.get('upstash-signature');
  if (qstashSig) {
    const rawBody = await req.text();
    const result = await verifyQStashSignature(qstashSig, rawBody);
    if (result.valid) {
      logger.info('Cron auth: QStash signature verified');
      return { authorized: true, body: result.body };
    }
    logger.warn('Cron auth: QStash signature invalid', { error: result.error });
    return { authorized: false };
  }

  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SIGNING_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { authorized: true };
  }

  logger.warn('Cron auth: No valid credentials');
  return { authorized: false };
}
