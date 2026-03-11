import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { leadUpdateSchema } from '@/lib/validators/crm';
import { NextRequest, NextResponse } from 'next/server';
import { scoreLead } from '@/lib/crm/scoring-engine';
import type { ScoringRule } from '@/lib/crm/scoring-engine';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import {
  UNAUTHORIZED,
  INVALID_JSON,
  validationError,
  notFound,
  dbError,
  errorResponse,
} from '@/lib/api/errors';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('leads')
    .select(
      'id, company_name, status, lost_reason, lead_score, fit_score, intent_score, engagement_score, source_channel, utm_campaign, source_detail, assigned_to, division_id, created_at, updated_at, city, province, address, postal_code, industry, next_followup_at, last_touch_at, is_qualified, automation_paused, current_sequence_id, domain, enrichment_status, enrichment_data, deleted_at, project_type, project_description, estimated_value, estimated_sqft, timeline_urgency',
    )
    .eq('id', id)
    .single();

  if (error) {
    return errorResponse(error.code === 'PGRST116' ? notFound('Lead') : dbError(error.message));
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(INVALID_JSON);
  }

  const parsed = leadUpdateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const { data, error } = await supabase
    .from('leads')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return errorResponse(error.code === 'PGRST116' ? notFound('Lead') : dbError(error.message));
  }

  // Fire-and-forget: notify assignee if owner changed
  if (parsed.data.assigned_to && data.assigned_to) {
    dispatchNotification({
      type: 'lead_assigned',
      assignee_email: '',
      assignee_name: 'Team Member',
      lead_company: data.company_name ?? 'Unknown',
      lead_id: id,
      assigned_by_name: 'A team member',
    }).catch((err) => logger.error('Lead assignment notification failed', { error: err }));
  }

  // Auto-score on update (non-blocking)
  try {
    const rulesQuery = supabase
      .from('scoring_rules')
      .select(
        'id, name, category, field_name, operator, value, score_impact, is_active, priority, division_id, created_at, updated_at',
      )
      .eq('is_active', true);

    const { data: rules } = await rulesQuery;
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
    // Scoring failure should not block lead update
    logger.error('Auto-score on update failed', { error: e });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { error } = await supabase.from('leads').delete().eq('id', id);

  if (error) return errorResponse(dbError(error.message));

  return NextResponse.json({ success: true });
}
