import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import type { ScoringRule } from '@/lib/crm/scoring-engine';
import { scoreLead } from '@/lib/crm/scoring-engine';
import { logger } from '@/lib/logger';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import { createUserClientSafe } from '@/lib/supabase/server';
import { leadUpdateSchema } from '@/lib/validators/crm';

const LEAD_SELECT =
  'id, company_name, status, lost_reason, lead_score, fit_score, intent_score, engagement_score, source_channel, utm_campaign, source_detail, assigned_to, division_id, created_at, updated_at, city, province, address, postal_code, industry, next_followup_at, last_touch_at, is_qualified, automation_paused, current_sequence_id, domain, enrichment_status, enrichment_data, deleted_at';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase.from('leads').select(LEAD_SELECT).eq('id', id).single();

  if (error) throw error.code === 'PGRST116' ? notFound('Lead') : dbError(error.message);

  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: leadUpdateSchema },
  async ({ params, body, logger: reqLogger }) => {
    const { id } = params;
    const parsed = body as Record<string, unknown>;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('leads')
      .update(parsed)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error.code === 'PGRST116' ? notFound('Lead') : dbError(error.message);

    if (parsed.assigned_to && data.assigned_to) {
      dispatchNotification({
        type: 'lead_assigned',
        assignee_email: '',
        assignee_name: 'Team Member',
        lead_company: data.company_name ?? 'Unknown',
        lead_id: id,
        assigned_by_name: 'A team member',
      }).catch((err) => logger.error('Lead assignment notification failed', { error: err }));
    }

    try {
      const { data: rules } = await supabase
        .from('scoring_rules')
        .select(
          'id, name, category, field_name, operator, value, score_impact, is_active, priority, division_id, created_at, updated_at',
        )
        .eq('is_active', true);

      if (rules && rules.length > 0) {
        const result = scoreLead(data as Record<string, unknown>, rules as ScoringRule[]);
        await supabase.from('leads').update({ lead_score: result.total_score }).eq('id', id);
        await supabase.from('lead_score_history').insert({
          lead_id: id,
          lead_score: result.total_score,
          fit_score: result.fit_score,
          intent_score: result.intent_score,
          engagement_score: result.engagement_score,
          triggered_by: 'auto_update',
        });
        data.lead_score = result.total_score;
      }
    } catch (e) {
      logger.error('Auto-score on update failed', { error: e });
    }

    return NextResponse.json(data);
  },
);

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});
