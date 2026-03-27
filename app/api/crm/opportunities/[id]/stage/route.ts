import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { type OpportunityStage, validateTransition } from '@/lib/crm/opportunity-stages';
import { createUserClientSafe } from '@/lib/supabase/server';
import { opportunityStageTransitionSchema } from '@/lib/validators/crm';

export const POST = withApiRoute(
  { bodySchema: opportunityStageTransitionSchema },
  async ({ params, body, logger }) => {
    const { id } = params;
    const { stage: newStage, lost_reason } = body as z.infer<
      typeof opportunityStageTransitionSchema
    >;

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data: currentOpportunity, error: fetchError } = await supabase
      .from('opportunities')
      .select(
        'id, opportunity_name, stage, estimated_revenue, probability_pct, target_close_date, account_id, contact_id, lead_id, division_id, owner_user_id, notes, created_at, updated_at',
      )
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') throw notFound('Opportunity');
      throw dbError(fetchError.message);
    }

    const currentStage = currentOpportunity.stage as OpportunityStage;
    const result = validateTransition(currentStage, newStage);

    if (!result.valid) {
      return NextResponse.json(
        { error: { code: 'INVALID_TRANSITION', message: result.reason } },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = { stage: newStage };
    if (lost_reason) {
      updateData.lost_reason = lost_reason;
    }

    const { data: updated, error: updateError } = await supabase
      .from('opportunities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw dbError(updateError.message);

    // Record stage transition in history (non-blocking)
    try {
      await supabase.from('opportunity_stage_history').insert({
        opportunity_id: id,
        from_stage: currentStage,
        to_stage: newStage,
      });
    } catch {
      logger.error('Failed to record opportunity stage history', { opportunityId: id });
    }

    return NextResponse.json(updated);
  },
);
