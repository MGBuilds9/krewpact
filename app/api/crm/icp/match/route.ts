import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import type { ICPProfile, LeadForICP } from '@/lib/crm/icp-engine';
import { scoreLeadAgainstICP } from '@/lib/crm/icp-engine';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

/**
 * POST /api/crm/icp/match
 *
 * Match all active leads against all active ICPs.
 * Upserts results into icp_lead_matches.
 *
 * Body: { limit?: number } — max leads to process (default 200)
 */

type SupabaseClient = Awaited<ReturnType<typeof createUserClientSafe>>['client'];

interface IcpProfileRow {
  id: string;
  name: string;
  industry_match: string[];
  geography_match: ICPProfile['geography_match'];
  project_value_range: ICPProfile['project_value_range'];
  repeat_rate_weight: number;
  top_sources: string[];
}

interface MatchUpsert {
  icp_id: string;
  lead_id: string;
  match_score: number;
  match_details: Record<string, number>;
  computed_at: string;
}

function buildIcpProfile(row: IcpProfileRow): ICPProfile {
  return {
    name: row.name,
    description: '',
    division_id: null,
    is_auto_generated: false,
    industry_match: row.industry_match,
    geography_match: row.geography_match ?? { cities: [], provinces: [] },
    project_value_range: row.project_value_range ?? { min: 0, max: 0 },
    project_types: [],
    repeat_rate_weight: row.repeat_rate_weight,
    sample_size: 0,
    confidence_score: 0,
    avg_deal_value: 0,
    avg_project_duration_days: 0,
    top_sources: row.top_sources,
  };
}

function computeMatchRows(
  leads: Array<{
    id: string;
    industry: string | null;
    city: string | null;
    province: string | null;
    source_channel: string | null;
    enrichment_data: unknown;
  }>,
  icpProfiles: IcpProfileRow[],
  computedAt: string,
): MatchUpsert[] {
  const upserts: MatchUpsert[] = [];
  leads.forEach((lead) => {
    const enrichment = (lead.enrichment_data as Record<string, unknown>) ?? {};
    const estimatedValue =
      typeof enrichment['estimated_value'] === 'number' ? enrichment['estimated_value'] : null;
    const leadForICP: LeadForICP = {
      id: lead.id,
      industry: lead.industry ?? null,
      city: lead.city ?? null,
      province: lead.province ?? null,
      source_channel: lead.source_channel ?? null,
      estimated_value: estimatedValue,
    };
    icpProfiles.forEach((icp) => {
      const profile = buildIcpProfile(icp);
      const { score, details } = scoreLeadAgainstICP(leadForICP, profile);
      upserts.push({
        icp_id: icp.id,
        lead_id: lead.id,
        match_score: score,
        match_details: details,
        computed_at: computedAt,
      });
    });
  });
  return upserts;
}

async function upsertMatchRows(
  supabase: SupabaseClient,
  matchUpserts: MatchUpsert[],
): Promise<number> {
  const BATCH_SIZE = 100;
  let totalUpserted = 0;
  for (let i = 0; i < matchUpserts.length; i += BATCH_SIZE) {
    const batch = matchUpserts.slice(i, i + BATCH_SIZE);
    const { error: upsertError } = await supabase
      .from('icp_lead_matches')
      .upsert(batch, { onConflict: 'icp_id,lead_id' });
    if (upsertError) {
      logger.error('ICP match: upsert batch failed', { error: upsertError.message });
    } else {
      totalUpserted += batch.length;
    }
  }
  return totalUpserted;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 5, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let limit = 200;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.limit === 'number') limit = Math.min(Math.max(1, body.limit), 500);
  } catch {
    // ignore parse errors; use default limit
  }

  try {
    const { data: icpRows, error: icpError } = await supabase
      .from('ideal_client_profiles')
      .select(
        'id, name, industry_match, geography_match, project_value_range, repeat_rate_weight, top_sources',
      )
      .eq('is_active', true);
    if (icpError) {
      logger.error('ICP match: fetch ICPs failed', { error: icpError.message });
      return NextResponse.json({ error: icpError.message }, { status: 500 });
    }
    if (!icpRows || icpRows.length === 0)
      return NextResponse.json({ message: 'No active ICPs found.', matched: 0 });

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, industry, city, province, source_channel, enrichment_data')
      .is('deleted_at', null)
      .not('status', 'in', '("won","lost")')
      .limit(limit);
    if (leadsError) {
      logger.error('ICP match: fetch leads failed', { error: leadsError.message });
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }
    if (!leads || leads.length === 0)
      return NextResponse.json({ message: 'No active leads found.', matched: 0 });

    const icpProfiles: IcpProfileRow[] = icpRows.map((row) => ({
      id: row.id,
      name: row.name,
      industry_match: Array.isArray(row.industry_match) ? (row.industry_match as string[]) : [],
      geography_match: (row.geography_match as ICPProfile['geography_match']) ?? {
        cities: [],
        provinces: [],
      },
      project_value_range: (row.project_value_range as ICPProfile['project_value_range']) ?? {
        min: 0,
        max: 0,
      },
      repeat_rate_weight: (row.repeat_rate_weight as number) ?? 0,
      top_sources: Array.isArray(row.top_sources) ? (row.top_sources as string[]) : [],
    }));

    const matchUpserts = computeMatchRows(leads, icpProfiles, new Date().toISOString());
    const totalUpserted = await upsertMatchRows(supabase, matchUpserts);

    logger.info(
      `ICP match complete: ${leads.length} leads × ${icpProfiles.length} ICPs = ${matchUpserts.length} pairs, ${totalUpserted} upserted`,
    );
    return NextResponse.json({
      message: `Matched ${leads.length} leads against ${icpProfiles.length} ICPs.`,
      leads_processed: leads.length,
      icps_evaluated: icpProfiles.length,
      pairs_upserted: totalUpserted,
    });
  } catch (err) {
    logger.error('POST /api/crm/icp/match error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
