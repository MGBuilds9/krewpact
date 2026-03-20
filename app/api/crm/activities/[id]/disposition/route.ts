import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { routeOutcome } from '@/lib/crm/outcome-router';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

const dispositionSchema = z.object({
  outcome: z.enum(['interested', 'follow_up', 'not_interested', 'no_answer']),
  followUpDays: z.number().int().min(1).max(30).optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * POST /api/crm/activities/[id]/disposition
 *
 * Records an outcome for a CRM activity and auto-routes the next action:
 * - interested → qualify lead, stop sequences, create opportunity
 * - follow_up → create follow-up task in N days
 * - not_interested → mark lead lost, stop sequences
 * - no_answer → retry (max 3), then mark cold
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;

  // Validate input
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = dispositionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const result = await routeOutcome(supabase, id, parsed.data.outcome, {
      followUpDays: parsed.data.followUpDays,
      notes: parsed.data.notes,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message.includes('not found')) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    logger.error('Disposition routing failed', { activityId: id, error: message });
    return NextResponse.json({ error: 'Failed to process disposition' }, { status: 500 });
  }
}
