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

type PipelineRpcRow = { stage: string; count: number; value: number };
type PortfolioRpcRow = { status: string; count: number };
type EstimatingRpcRow = { status: string; count: number };
type SubscriptionRpcRow = {
  total_monthly: number;
  active_count: number;
  expiring_soon_count: number;
};

function buildPipelineSummary(rows: PipelineRpcRow[]): PipelineSummary {
  const totalValue = rows.reduce((sum, r) => sum + (r.value ?? 0), 0);
  const totalOpps = rows.reduce((sum, r) => sum + (r.count ?? 0), 0);
  const wonRow = rows.find((r) => r.stage === 'closed_won');
  const wonCount = wonRow?.count ?? 0;
  const winRate = totalOpps > 0 ? Math.round((wonCount / totalOpps) * 100 * 10) / 10 : 0;
  const avgDealSize = totalOpps > 0 ? Math.round(totalValue / totalOpps) : 0;
  const stageBreakdown = rows.map((r) => ({ stage: r.stage, count: r.count, value: r.value }));
  return { totalValue, stageBreakdown, winRate, avgDealSize };
}

function buildProjectPortfolio(rows: PortfolioRpcRow[]): ProjectPortfolio {
  const activeRow = rows.find((r) => r.status === 'active');
  const activeCount = activeRow?.count ?? 0;
  const statusBreakdown = rows.map((r) => ({ status: r.status, count: r.count }));
  return { activeCount, statusBreakdown };
}

function buildEstimatingVelocity(rows: EstimatingRpcRow[]): EstimatingVelocity {
  const totalEstimates = rows.reduce((sum, r) => sum + (r.count ?? 0), 0);
  const statusBreakdown = rows.map((r) => ({ status: r.status, count: r.count }));
  return { totalEstimates, statusBreakdown };
}

function buildSubscriptionSummary(rows: SubscriptionRpcRow[]): SubscriptionSummary {
  const row = rows[0];
  if (!row) return { totalMonthlyCost: 0, activeCount: 0, upcomingRenewals: 0 };
  return {
    totalMonthlyCost: Number(row.total_monthly) || 0,
    activeCount: row.active_count ?? 0,
    upcomingRenewals: row.expiring_soon_count ?? 0,
  };
}

export async function computePipelineSummary(supabase: SupabaseClient): Promise<PipelineSummary> {
  const { data } = await supabase.rpc('get_pipeline_summary');
  return buildPipelineSummary((data as PipelineRpcRow[]) ?? []);
}

export async function computeProjectPortfolio(supabase: SupabaseClient): Promise<ProjectPortfolio> {
  const { data } = await supabase.rpc('get_project_portfolio');
  return buildProjectPortfolio((data as PortfolioRpcRow[]) ?? []);
}

export async function computeEstimatingVelocity(
  supabase: SupabaseClient,
): Promise<EstimatingVelocity> {
  const { data } = await supabase.rpc('get_estimating_velocity');
  return buildEstimatingVelocity((data as EstimatingRpcRow[]) ?? []);
}

export async function computeSubscriptionSummary(
  supabase: SupabaseClient,
): Promise<SubscriptionSummary> {
  const { data } = await supabase.rpc('get_subscription_summary');
  return buildSubscriptionSummary((data as SubscriptionRpcRow[]) ?? []);
}

// Division-filtered variants

export async function computePipelineSummaryForDivision(
  supabase: SupabaseClient,
  division: string,
): Promise<PipelineSummary> {
  const { data } = await supabase.rpc('get_pipeline_summary', { p_division_id: division });
  return buildPipelineSummary((data as PipelineRpcRow[]) ?? []);
}

export async function computeProjectPortfolioForDivision(
  supabase: SupabaseClient,
  division: string,
): Promise<ProjectPortfolio> {
  const { data } = await supabase.rpc('get_project_portfolio', { p_division_id: division });
  return buildProjectPortfolio((data as PortfolioRpcRow[]) ?? []);
}

export async function computeSubscriptionSummaryForDivision(
  supabase: SupabaseClient,
  division: string,
): Promise<SubscriptionSummary> {
  const { data } = await supabase.rpc('get_subscription_summary', { p_division_id: division });
  return buildSubscriptionSummary((data as SubscriptionRpcRow[]) ?? []);
}

export async function computeEstimatingVelocityForDivision(
  supabase: SupabaseClient,
  division: string,
): Promise<EstimatingVelocity> {
  const { data } = await supabase.rpc('get_estimating_velocity', { p_division_id: division });
  return buildEstimatingVelocity((data as EstimatingRpcRow[]) ?? []);
}
