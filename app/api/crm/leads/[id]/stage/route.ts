import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { type LeadStage, validateTransition } from '@/lib/crm/lead-stages';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';
import { leadStageTransitionSchema } from '@/lib/validators/crm';

const LEAD_SELECT =
  'id, company_name, status, lost_reason, lead_score, fit_score, intent_score, engagement_score, source_channel, utm_campaign, source_detail, assigned_to, division_id, created_at, updated_at, city, province, address, postal_code, industry, next_followup_at, last_touch_at, is_qualified, automation_paused, current_sequence_id, domain, enrichment_status, enrichment_data, deleted_at';

export const POST = withApiRoute(
  { bodySchema: leadStageTransitionSchema },
  async ({ params, body }) => {
    const { id } = params;
    const parsed = body as { status: LeadStage; lost_reason?: string };
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data: currentLead, error: fetchError } = await supabase
      .from('leads')
      .select(LEAD_SELECT)
      .eq('id', id)
      .single();

    if (fetchError)
      throw fetchError.code === 'PGRST116' ? notFound('Lead') : dbError(fetchError.message);

    const currentStage = currentLead.status as LeadStage;
    const newStage = parsed.status;
    const result = validateTransition(currentStage, newStage);

    if (!result.valid) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { status: newStage };
    if (parsed.lost_reason) updateData.lost_reason = parsed.lost_reason;

    const { data: updated, error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw dbError(updateError.message);

    try {
      await supabase.from('lead_stage_history').insert({
        lead_id: id,
        from_stage: currentStage,
        to_stage: newStage,
        notes: parsed.lost_reason ?? null,
      });
    } catch {
      logger.error('Failed to record lead stage history', { leadId: id });
    }

    return NextResponse.json(updated);
  },
);
