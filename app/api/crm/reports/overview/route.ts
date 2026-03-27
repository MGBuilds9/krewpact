import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

function aggregateLeads(leads: Array<Record<string, unknown>>) {
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byDivision: Record<string, number> = {};
  for (const lead of leads) {
    const s = lead.status as string;
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    if (lead.source_channel) {
      const src = lead.source_channel as string;
      bySource[src] = (bySource[src] ?? 0) + 1;
    }
    if (lead.division_id) {
      const div = lead.division_id as string;
      byDivision[div] = (byDivision[div] ?? 0) + 1;
    }
  }
  return { byStatus, bySource, byDivision };
}

function aggregateOpportunities(opportunities: Array<Record<string, unknown>>) {
  const byStage: Record<string, { count: number; revenue: number }> = {};
  let totalRevenue = 0;
  for (const opp of opportunities) {
    const stage = opp.stage as string;
    if (!byStage[stage]) byStage[stage] = { count: 0, revenue: 0 };
    byStage[stage].count++;
    byStage[stage].revenue += (opp.estimated_revenue as number) ?? 0;
    totalRevenue += (opp.estimated_revenue as number) ?? 0;
  }
  return { byStage, totalRevenue };
}

function aggregateActivities(activities: Array<Record<string, unknown>>) {
  const byType: Record<string, number> = {};
  for (const act of activities) {
    const t = act.activity_type as string;
    byType[t] = (byType[t] ?? 0) + 1;
  }
  return byType;
}

function aggregateBids(bids: Array<Record<string, unknown>>) {
  const byStatus: Record<string, number> = {};
  let totalValue = 0;
  for (const bid of bids) {
    const s = bid.status as string;
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    totalValue += (bid.estimated_value as number) ?? 0;
  }
  return { byStatus, totalValue };
}

type CountResults = [
  { count: number | null },
  { count: number | null },
  { count: number | null },
  { count: number | null },
  { count: number | null },
  { count: number | null },
];

function extractCounts(results: CountResults) {
  const [leads, contacts, accounts, opportunities, activities, bidding] = results;
  return {
    totalLeads: leads.count ?? 0,
    totalContacts: contacts.count ?? 0,
    totalAccounts: accounts.count ?? 0,
    totalOpportunities: opportunities.count ?? 0,
    totalBids: bidding.count ?? 0,
    activitiesLast30Days: activities.count ?? 0,
  };
}

async function fetchOverviewData(supabase: SupabaseClient) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return Promise.all([
    supabase
      .from('leads')
      .select('id, status, division_id, source_channel, lead_score, created_at', {
        count: 'exact',
      }),
    supabase.from('contacts').select('id', { count: 'exact', head: true }),
    supabase.from('accounts').select('id', { count: 'exact', head: true }),
    supabase
      .from('opportunities')
      .select('id, stage, estimated_revenue, division_id, created_at', { count: 'exact' }),
    supabase
      .from('activities')
      .select('id, activity_type, created_at', { count: 'exact' })
      .gte('created_at', thirtyDaysAgo),
    supabase
      .from('bidding_opportunities')
      .select('id, status, estimated_value', { count: 'exact' }),
  ]);
}

async function computeOverview(supabase: SupabaseClient) {
  const rawResults = await fetchOverviewData(supabase);
  const [leadsResult, , , opportunitiesResult, activitiesResult, biddingResult] = rawResults;

  const {
    byStatus: leadsByStatus,
    bySource: leadsBySource,
    byDivision: leadsByDivision,
  } = aggregateLeads((leadsResult.data ?? []) as Array<Record<string, unknown>>);
  const { byStage: pipeline, totalRevenue: totalPipelineRevenue } = aggregateOpportunities(
    (opportunitiesResult.data ?? []) as Array<Record<string, unknown>>,
  );
  const activityVolume = aggregateActivities(
    (activitiesResult.data ?? []) as Array<Record<string, unknown>>,
  );
  const { byStatus: bidding, totalValue: totalBidValue } = aggregateBids(
    (biddingResult.data ?? []) as Array<Record<string, unknown>>,
  );

  const counts = extractCounts(rawResults);
  const wonLeads = leadsByStatus['won'] ?? 0;
  const conversionRate = counts.totalLeads > 0 ? (wonLeads / counts.totalLeads) * 100 : 0;

  return {
    summary: {
      ...counts,
      totalPipelineRevenue,
      conversionRate: Math.round(conversionRate * 10) / 10,
      totalBidValue,
    },
    leadFunnel: leadsByStatus,
    leadsBySource,
    leadsByDivision,
    pipeline,
    activityVolume,
    bidding,
  };
}

export const GET = withApiRoute({ rateLimit: { limit: 30, window: '1 m' } }, async () => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const overview = await computeOverview(supabase);
  return NextResponse.json(overview);
});
