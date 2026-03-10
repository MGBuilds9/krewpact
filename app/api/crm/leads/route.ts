import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { leadCreateSchema } from '@/lib/validators/crm';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { scoreLead } from '@/lib/crm/scoring-engine';
import type { ScoringRule } from '@/lib/crm/scoring-engine';
import { assignLead } from '@/lib/crm/lead-assignment';
import {
  UNAUTHORIZED,
  INVALID_JSON,
  validationError,
  dbError,
  errorResponse,
} from '@/lib/api/errors';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';

const leadStatuses = [
  'new',
  'contacted',
  'qualified',
  'unqualified',
  'nurturing',
  'won',
  'lost',
  'disqualified',
] as const;

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  status: z.enum(leadStatuses).optional(),
  assigned_to: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  sort_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const { division_id, status, assigned_to, search, limit, offset, sort_by, sort_dir } =
    parsed.data;
  const supabase = await createUserClient();

  let query = supabase
    .from('leads')
    .select(
      'id, company_name, status, lead_score, fit_score, intent_score, engagement_score, source_channel, utm_campaign, source_detail, assigned_to, division_id, created_at, updated_at, city, province, address, postal_code, industry, next_followup_at, last_touch_at, is_qualified, automation_paused, current_sequence_id, domain, enrichment_status, deleted_at',
      { count: 'exact' },
    )
    .is('deleted_at', null)
    .order(sort_by ?? 'lead_score', { ascending: sort_dir === 'asc', nullsFirst: false });

  if (division_id) {
    query = query.eq('division_id', division_id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (assigned_to) {
    query = query.eq('assigned_to', assigned_to);
  }

  if (search) {
    query = query.ilike('company_name', `%${search}%`);
  }

  const effectiveLimit = limit ?? 25;
  const effectiveOffset = offset ?? 0;
  query = query.range(effectiveOffset, effectiveOffset + effectiveLimit - 1);

  const { data, error, count } = await query;

  if (error) return errorResponse(dbError(error.message));

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    hasMore: effectiveOffset + (data?.length ?? 0) < (count ?? 0),
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(INVALID_JSON);
  }

  const parsed = leadCreateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const supabase = await createUserClient();

  // Auto-assign owner if not explicitly set
  let ownerId: string | undefined = parsed.data.assigned_to;
  if (!ownerId) {
    try {
      const assignment = await assignLead(supabase, {
        division_id: parsed.data.division_id ?? null,
        source_channel: parsed.data.source_channel ?? null,
      });
      if (assignment.assigned && assignment.assigned_to) {
        ownerId = assignment.assigned_to;
      }
    } catch (e) {
      // Assignment failure should not block lead creation
      logger.error('Auto-assign on create failed', { error: e });
    }
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({ ...parsed.data, status: 'new', assigned_to: ownerId })
    .select()
    .single();

  if (error) return errorResponse(dbError(error.message));

  // Auto-score the new lead (non-blocking)
  try {
    const rulesQuery = supabase
      .from('scoring_rules')
      .select(
        'id, name:rule_name, category, field_name, operator, value, score_impact:points, active, description, created_at, updated_at',
      )
      .eq('active', true);

    const { data: rules } = await rulesQuery;
    if (rules && rules.length > 0) {
      const result = scoreLead(data as Record<string, unknown>, rules as ScoringRule[]);
      await supabase.from('leads').update({ lead_score: result.total_score }).eq('id', data.id);

      await supabase.from('lead_score_history').insert({
        lead_id: data.id,
        score: result.total_score,
        previous_score: 0,
        rule_results: result.rule_results as unknown as Record<string, unknown>,
      });

      data.lead_score = result.total_score;
    }
  } catch (e) {
    // Scoring failure should not block lead creation
    logger.error('Auto-score on create failed', { error: e });
  }

  return NextResponse.json(data, { status: 201 });
}
