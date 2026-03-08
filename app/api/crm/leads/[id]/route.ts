import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('leads')
    .select(
      'id, company_name, status, substatus, lifecycle_stage, lead_score, fit_score, intent_score, engagement_score, source_channel, source_campaign, attribution_source, attribution_detail, assigned_to:owner_id, division_id, division_assigned_at, division_assigned_by, created_at, updated_at, city, province, address, postal_code, country, industry, company_size, revenue_range, next_followup_at, last_activity_at, last_contacted_at, is_qualified, in_sequence, sequence_paused, notes, tags, custom_fields, domain, enrichment_status, enrichment_data, deleted_at, stage_entered_at',
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

  const supabase = await createUserClient();
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
  if (parsed.data.owner_id && data.owner_id) {
    dispatchNotification({
      type: 'lead_assigned',
      assignee_email: ((data as Record<string, unknown>).owner_email as string) ?? '',
      assignee_name: ((data as Record<string, unknown>).owner_name as string) ?? 'Team Member',
      lead_company: data.company_name ?? 'Unknown',
      lead_id: id,
      assigned_by_name: 'A team member',
    }).catch((err) => console.error('Lead assignment notification failed:', err));
  }

  // Auto-score on update (non-blocking)
  try {
    const rulesQuery = supabase
      .from('scoring_rules')
      .select(
        'id, name:rule_name, category, field_name, operator, value, score_impact:points, active, description, created_at, updated_at',
      )
      .eq('active', true);

    const { data: rules } = await rulesQuery;
    if (rules && rules.length > 0) {
      const previousScore = data.lead_score ?? 0;
      const result = scoreLead(data as Record<string, unknown>, rules as ScoringRule[]);
      await supabase.from('leads').update({ lead_score: result.total_score }).eq('id', id);

      await supabase.from('lead_score_history').insert({
        lead_id: id,
        score: result.total_score,
        previous_score: previousScore,
        rule_results: result.rule_results as unknown as Record<string, unknown>,
      });

      data.lead_score = result.total_score;
    }
  } catch (e) {
    // Scoring failure should not block lead update
    console.error('Auto-score on update failed:', e);
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  const { id } = await context.params;
  const supabase = await createUserClient();
  const { error } = await supabase.from('leads').delete().eq('id', id);

  if (error) return errorResponse(dbError(error.message));

  return NextResponse.json({ success: true });
}
