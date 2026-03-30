import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { verifyCronAuth } from '@/lib/api/cron-auth';
import { withApiRoute } from '@/lib/api/with-api-route';
import { processSequences } from '@/lib/crm/sequence-processor';
import { createServiceClient, createUserClientSafe } from '@/lib/supabase/server';

/**
 * POST /api/crm/sequences/process
 *
 * Process all active sequence enrollments where next_step_at <= now.
 * Can be called by:
 * 1. A cron job with Authorization: Bearer <CRON_SECRET> header (via verifyCronAuth)
 * 2. An authenticated user (manual trigger)
 */
export const POST = withApiRoute({ auth: 'public' }, async ({ req }) => {
  const cronResult = await verifyCronAuth(req);

  if (cronResult.authorized) {
    const supabase = createServiceClient();
    const result = await processSequences(supabase);
    return NextResponse.json(result);
  }

  // Fall back to user auth
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const result = await processSequences(supabase);
  return NextResponse.json(result);
});
