import { NextResponse } from 'next/server';
import { z } from 'zod';

import { notFound, serverError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { routeOutcome } from '@/lib/crm/outcome-router';
import { createUserClientSafe } from '@/lib/supabase/server';

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
export const POST = withApiRoute(
  { bodySchema: dispositionSchema, rateLimit: { limit: 30, window: '1 m' } },
  async ({ params, body, logger }) => {
    const { id } = params;
    const { outcome, followUpDays, notes } = body as z.infer<typeof dispositionSchema>;

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    try {
      const result = await routeOutcome(supabase, id, outcome, { followUpDays, notes });
      return NextResponse.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('not found')) throw notFound('Activity');
      logger.error('Disposition routing failed', { activityId: id, error: message });
      throw serverError('Failed to process disposition');
    }
  },
);
