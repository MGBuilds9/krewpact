import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createUserClient, createServiceClient } from '@/lib/supabase/server';
import { processSequences } from '@/lib/crm/sequence-processor';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

/**
 * POST /api/crm/sequences/process
 *
 * Process all active sequence enrollments where next_step_at <= now.
 * Can be called by:
 * 1. A cron job with x-cron-secret header
 * 2. An authenticated user (manual trigger)
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;

  // Auth: either cron secret or authenticated user
  if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
    // Cron job — use service role client
    const supabase = createServiceClient();
    const result = await processSequences(supabase);
    return NextResponse.json(result);
  }

  // Fall back to user auth
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const supabase = await createUserClient();
  const result = await processSequences(supabase);
  return NextResponse.json(result);
}
