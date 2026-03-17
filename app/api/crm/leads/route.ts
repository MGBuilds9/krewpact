import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  dbError,
  errorResponse,
  INVALID_JSON,
  UNAUTHORIZED,
  validationError,
} from '@/lib/api/errors';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { matchLeadToAccounts } from '@/lib/crm/lead-account-matcher';
import { assignLead } from '@/lib/crm/lead-assignment';
import type { ScoringRule } from '@/lib/crm/scoring-engine';
import { scoreLead } from '@/lib/crm/scoring-engine';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';
import { leadCreateSchema } from '@/lib/validators/crm';

const leadStatuses = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'nurture',
  'won',
  'lost',
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
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const effectiveLimit = limit ?? 25;
  const effectiveOffset = offset ?? 0;

  const eqFilters = Object.entries({ division_id, status, assigned_to }).filter(
    (entry): entry is [string, string] => entry[1] != null,
  );

  let query = supabase
    .from('leads')
    .select(
      'id, company_name, status, lead_score, fit_score, intent_score, engagement_score, source_channel, utm_campaign, source_detail, assigned_to, division_id, created_at, updated_at, city, province, address, postal_code, industry, next_followup_at, last_touch_at, is_qualified, automation_paused, current_sequence_id, domain, enrichment_status, deleted_at',
      { count: 'exact' },
    )
    .is('deleted_at', null)
    .order(sort_by ?? 'lead_score', { ascending: sort_dir === 'asc', nullsFirst: false });

  eqFilters.forEach(([field, value]) => {
    query = query.eq(field, value);
  });
  if (search) query = query.ilike('company_name', `%${search}%`);
  query = query.range(effectiveOffset, effectiveOffset + effectiveLimit - 1);

  const { data, error, count } = await query;
  if (error) return errorResponse(dbError(error.message));

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    hasMore: effectiveOffset + (data?.length ?? 0) < (count ?? 0),
  });
}

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

async function autoScoreLead(
  supabase: SupabaseClient,
  lead: Record<string, unknown>,
  leadId: string,
): Promise<void> {
  const { data: rules } = await supabase
    .from('scoring_rules')
    .select(
      'id, name, category, field_name, operator, value, score_impact, is_active, priority, division_id, created_at, updated_at',
    )
    .eq('is_active', true);
  if (!rules || rules.length === 0) return;
  const result = scoreLead(lead, rules as ScoringRule[]);
  await supabase.from('leads').update({ lead_score: result.total_score }).eq('id', leadId);
  await supabase.from('lead_score_history').insert({
    lead_id: leadId,
    lead_score: result.total_score,
    fit_score: result.fit_score,
    intent_score: result.intent_score,
    engagement_score: result.engagement_score,
    triggered_by: 'auto_create',
  });
  lead.lead_score = result.total_score;
}

async function autoMatchAccounts(
  supabase: SupabaseClient,
  lead: Record<string, unknown>,
  leadId: string,
): Promise<void> {
  const { data: allAccounts } = await supabase
    .from('accounts')
    .select(
      'id, account_name, email, phone, website, address, total_projects, last_project_date, lifetime_revenue',
    )
    .is('deleted_at', null);
  if (!allAccounts || allAccounts.length === 0) return;
  const matches = matchLeadToAccounts(
    lead as unknown as Parameters<typeof matchLeadToAccounts>[0],
    allAccounts,
  );
  if (matches.length === 0) return;
  const matchInserts = matches.map((m) => ({
    lead_id: leadId,
    account_id: m.account_id,
    match_type: m.match_type,
    match_score: m.match_score,
  }));
  await supabase
    .from('lead_account_matches')
    .upsert(matchInserts, { onConflict: 'lead_id,account_id' });
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

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

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
    await autoScoreLead(supabase, data as Record<string, unknown>, data.id);
  } catch (e) {
    logger.error('Auto-score on create failed', { error: e });
  }

  // Auto-match against existing accounts (non-blocking)
  try {
    await autoMatchAccounts(supabase, data as Record<string, unknown>, data.id);
  } catch (e) {
    logger.error('Lead-account matching failed', { error: e });
  }

  return NextResponse.json(data, { status: 201 });
}
