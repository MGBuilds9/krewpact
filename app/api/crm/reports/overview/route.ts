import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const supabase = await createUserClient();

  const [
    leadsResult,
    contactsResult,
    accountsResult,
    opportunitiesResult,
    activitiesResult,
    biddingResult,
  ] = await Promise.all([
    supabase.from('leads').select('id, status, division_id, source_channel, lead_score, created_at', { count: 'exact' }),
    supabase.from('contacts').select('id', { count: 'exact', head: true }),
    supabase.from('accounts').select('id', { count: 'exact', head: true }),
    supabase.from('opportunities').select('id, stage, estimated_revenue, division_id, created_at', { count: 'exact' }),
    supabase.from('activities').select('id, activity_type, created_at', { count: 'exact' }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('bidding_opportunities').select('id, status, estimated_value', { count: 'exact' }),
  ]);

  // Lead funnel
  const leads = leadsResult.data ?? [];
  const leadsByStatus: Record<string, number> = {};
  const leadsBySource: Record<string, number> = {};
  const leadsByDivision: Record<string, number> = {};
  for (const lead of leads) {
    leadsByStatus[lead.status] = (leadsByStatus[lead.status] ?? 0) + 1;
    if (lead.source_channel) {
      leadsBySource[lead.source_channel] = (leadsBySource[lead.source_channel] ?? 0) + 1;
    }
    if (lead.division_id) {
      leadsByDivision[lead.division_id] = (leadsByDivision[lead.division_id] ?? 0) + 1;
    }
  }

  // Opportunity pipeline
  const opportunities = opportunitiesResult.data ?? [];
  const oppByStage: Record<string, { count: number; revenue: number }> = {};
  let totalPipelineRevenue = 0;
  for (const opp of opportunities) {
    if (!oppByStage[opp.stage]) oppByStage[opp.stage] = { count: 0, revenue: 0 };
    oppByStage[opp.stage].count++;
    oppByStage[opp.stage].revenue += opp.estimated_revenue ?? 0;
    totalPipelineRevenue += opp.estimated_revenue ?? 0;
  }

  // Activity volume (last 30 days)
  const activities = activitiesResult.data ?? [];
  const activityByType: Record<string, number> = {};
  for (const act of activities) {
    activityByType[act.activity_type] = (activityByType[act.activity_type] ?? 0) + 1;
  }

  // Bidding summary
  const bids = biddingResult.data ?? [];
  const bidsByStatus: Record<string, number> = {};
  let totalBidValue = 0;
  for (const bid of bids) {
    bidsByStatus[bid.status] = (bidsByStatus[bid.status] ?? 0) + 1;
    totalBidValue += bid.estimated_value ?? 0;
  }

  // Conversion rate
  const wonLeads = leadsByStatus['won'] ?? 0;
  const totalLeads = leadsResult.count ?? 0;
  const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

  return NextResponse.json({
    summary: {
      totalLeads: leadsResult.count ?? 0,
      totalContacts: contactsResult.count ?? 0,
      totalAccounts: accountsResult.count ?? 0,
      totalOpportunities: opportunitiesResult.count ?? 0,
      totalPipelineRevenue,
      conversionRate: Math.round(conversionRate * 10) / 10,
      activitiesLast30Days: activitiesResult.count ?? 0,
      totalBids: biddingResult.count ?? 0,
      totalBidValue,
    },
    leadFunnel: leadsByStatus,
    leadsBySource,
    leadsByDivision,
    pipeline: oppByStage,
    activityVolume: activityByType,
    bidding: bidsByStatus,
  });
}
