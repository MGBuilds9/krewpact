import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
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

export const GET = withApiRoute({ querySchema }, async ({ query }) => {
  const { division_id, status, assigned_to, search, limit, offset, sort_by, sort_dir } =
    query as z.infer<typeof querySchema>;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const effectiveLimit = limit ?? 25;
  const effectiveOffset = offset ?? 0;

  const eqFilters = Object.entries({ division_id, status, assigned_to }).filter(
    (entry): entry is [string, string] => entry[1] != null,
  );

  let dbQuery = supabase
    .from('leads')
    .select(
      'id, company_name, status, lead_score, fit_score, intent_score, engagement_score, source_channel, utm_campaign, source_detail, assigned_to, division_id, created_at, updated_at, city, province, address, postal_code, industry, next_followup_at, last_touch_at, is_qualified, automation_paused, current_sequence_id, domain, enrichment_status, deleted_at',
      { count: 'exact' },
    )
    .is('deleted_at', null)
    .order(sort_by ?? 'lead_score', { ascending: sort_dir === 'asc', nullsFirst: false });

  eqFilters.forEach(([field, value]) => {
    dbQuery = dbQuery.eq(field, value);
  });
  if (search) dbQuery = dbQuery.ilike('company_name', `%${search}%`);
  dbQuery = dbQuery.range(effectiveOffset, effectiveOffset + effectiveLimit - 1);

  const { data, error, count } = await dbQuery;
  if (error) throw dbError(error.message);

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    hasMore: effectiveOffset + (data?.length ?? 0) < (count ?? 0),
  });
});

export const POST = withApiRoute({ bodySchema: leadCreateSchema }, async ({ body, userId }) => {
  const parsed = body as z.infer<typeof leadCreateSchema>;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let ownerId: string | undefined = parsed.assigned_to;
  if (!ownerId) {
    try {
      const assignment = await assignLead(supabase, {
        division_id: parsed.division_id ?? null,
        source_channel: parsed.source_channel ?? null,
      });
      if (assignment.assigned && assignment.assigned_to) {
        ownerId = assignment.assigned_to;
      }
    } catch (e) {
      logger.error('Auto-assign on create failed', { error: e });
    }
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({ ...parsed, status: 'new', assigned_to: ownerId })
    .select()
    .single();

  if (error) throw dbError(error.message);

  try {
    await autoScoreLead(supabase, data as Record<string, unknown>, data.id);
  } catch (e) {
    logger.error('Auto-score on create failed', { error: e });
  }

  try {
    await autoMatchAccounts(supabase, data as Record<string, unknown>, data.id);
  } catch (e) {
    logger.error('Lead-account matching failed', { error: e });
  }

  return NextResponse.json(data, { status: 201 });
});
