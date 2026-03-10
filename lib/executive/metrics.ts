import type { SupabaseClient } from '@supabase/supabase-js';

export interface DivisionFilter {
  division: string;
}

export interface PipelineSummary {
  totalValue: number;
  stageBreakdown: { stage: string; count: number; value: number }[];
  winRate: number;
  avgDealSize: number;
}

export interface ProjectPortfolio {
  activeCount: number;
  statusBreakdown: { status: string; count: number }[];
}

export interface EstimatingVelocity {
  totalEstimates: number;
  statusBreakdown: { status: string; count: number }[];
}

export interface SubscriptionSummary {
  totalMonthlyCost: number;
  activeCount: number;
  upcomingRenewals: number;
}

export async function computePipelineSummary(supabase: SupabaseClient): Promise<PipelineSummary> {
  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, stage, estimated_revenue');
  const opportunities = opps ?? [];
  const totalValue = opportunities.reduce((sum, o) => sum + (o.estimated_revenue ?? 0), 0);
  const totalOpps = opportunities.length;
  const wonOpps = opportunities.filter((o) => o.stage === 'closed_won').length;
  const winRate = totalOpps > 0 ? Math.round((wonOpps / totalOpps) * 100 * 10) / 10 : 0;
  const avgDealSize = totalOpps > 0 ? Math.round(totalValue / totalOpps) : 0;

  const stageMap: Record<string, { count: number; value: number }> = {};
  for (const opp of opportunities) {
    const stage = opp.stage ?? 'unknown';
    if (!stageMap[stage]) stageMap[stage] = { count: 0, value: 0 };
    stageMap[stage].count++;
    stageMap[stage].value += opp.estimated_revenue ?? 0;
  }
  const stageBreakdown = Object.entries(stageMap).map(([stage, data]) => ({ stage, ...data }));

  return { totalValue, stageBreakdown, winRate, avgDealSize };
}

export async function computeProjectPortfolio(supabase: SupabaseClient): Promise<ProjectPortfolio> {
  const { data: projects } = await supabase.from('projects').select('id, status');
  const all = projects ?? [];
  const activeCount = all.filter((p) => p.status === 'active').length;
  const statusMap: Record<string, number> = {};
  for (const p of all) {
    const s = p.status ?? 'unknown';
    statusMap[s] = (statusMap[s] ?? 0) + 1;
  }
  const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
  return { activeCount, statusBreakdown };
}

export async function computeEstimatingVelocity(
  supabase: SupabaseClient,
): Promise<EstimatingVelocity> {
  const { data: estimates } = await supabase.from('estimates').select('id, status');
  const all = estimates ?? [];
  const statusMap: Record<string, number> = {};
  for (const e of all) {
    const s = e.status ?? 'unknown';
    statusMap[s] = (statusMap[s] ?? 0) + 1;
  }
  const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
  return { totalEstimates: all.length, statusBreakdown };
}

export async function computeSubscriptionSummary(
  supabase: SupabaseClient,
): Promise<SubscriptionSummary> {
  const { data: subs } = await supabase
    .from('executive_subscriptions')
    .select('id, monthly_cost, is_active, renewal_date');
  const all = subs ?? [];
  const active = all.filter((s) => s.is_active);
  const totalMonthlyCost = active.reduce((sum, s) => sum + (Number(s.monthly_cost) || 0), 0);
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const upcomingRenewals = active.filter(
    (s) => s.renewal_date && s.renewal_date >= today && s.renewal_date <= sevenDaysFromNow,
  ).length;
  return { totalMonthlyCost, activeCount: active.length, upcomingRenewals };
}

// Division-filtered variants — compute on-the-fly for a specific division

export async function computePipelineSummaryForDivision(
  supabase: SupabaseClient,
  division: string,
): Promise<PipelineSummary> {
  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, stage, estimated_revenue')
    .eq('division_id', division);
  const opportunities = opps ?? [];
  const totalValue = opportunities.reduce((sum, o) => sum + (o.estimated_revenue ?? 0), 0);
  const totalOpps = opportunities.length;
  const wonOpps = opportunities.filter((o) => o.stage === 'closed_won').length;
  const winRate = totalOpps > 0 ? Math.round((wonOpps / totalOpps) * 100 * 10) / 10 : 0;
  const avgDealSize = totalOpps > 0 ? Math.round(totalValue / totalOpps) : 0;

  const stageMap: Record<string, { count: number; value: number }> = {};
  for (const opp of opportunities) {
    const stage = opp.stage ?? 'unknown';
    if (!stageMap[stage]) stageMap[stage] = { count: 0, value: 0 };
    stageMap[stage].count++;
    stageMap[stage].value += opp.estimated_revenue ?? 0;
  }
  const stageBreakdown = Object.entries(stageMap).map(([stage, data]) => ({ stage, ...data }));

  return { totalValue, stageBreakdown, winRate, avgDealSize };
}

export async function computeProjectPortfolioForDivision(
  supabase: SupabaseClient,
  division: string,
): Promise<ProjectPortfolio> {
  const { data: projects } = await supabase
    .from('projects')
    .select('id, status')
    .eq('division_id', division);
  const all = projects ?? [];
  const activeCount = all.filter((p) => p.status === 'active').length;
  const statusMap: Record<string, number> = {};
  for (const p of all) {
    const s = p.status ?? 'unknown';
    statusMap[s] = (statusMap[s] ?? 0) + 1;
  }
  const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
  return { activeCount, statusBreakdown };
}

export async function computeSubscriptionSummaryForDivision(
  supabase: SupabaseClient,
  division: string,
): Promise<SubscriptionSummary> {
  const { data: subs } = await supabase
    .from('executive_subscriptions')
    .select('id, monthly_cost, is_active, renewal_date')
    .eq('division_id', division);
  const all = subs ?? [];
  const active = all.filter((s) => s.is_active);
  const totalMonthlyCost = active.reduce((sum, s) => sum + (Number(s.monthly_cost) || 0), 0);
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const upcomingRenewals = active.filter(
    (s) => s.renewal_date && s.renewal_date >= today && s.renewal_date <= sevenDaysFromNow,
  ).length;
  return { totalMonthlyCost, activeCount: active.length, upcomingRenewals };
}
