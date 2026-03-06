/**
 * Pipeline intelligence — pure calculation functions for
 * rep performance, aging, win/loss analysis, and forecasting.
 */

export interface RepOpportunityData {
  id: string;
  stage: string;
  estimated_revenue: number | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepPerformance {
  user_id: string;
  deals_won: number;
  revenue_closed: number;
  deals_lost: number;
  deals_open: number;
  conversion_rate: number;
  avg_deal_size: number;
}

export interface PipelineAgingEntry {
  stage: string;
  avg_days: number;
  count: number;
  stalled_count: number; // >14 days in stage
}

export interface WinLossEntry {
  dimension: string;
  won: number;
  lost: number;
  total: number;
  win_rate: number;
}

const TERMINAL_WON = ['contracted'];
const TERMINAL_LOST = ['closed_lost'];

export function calculateRepPerformance(opportunities: RepOpportunityData[]): RepPerformance[] {
  const repMap = new Map<string, { won: number; lost: number; open: number; revenue: number }>();

  for (const opp of opportunities) {
    const userId = opp.owner_user_id ?? 'unassigned';
    const entry = repMap.get(userId) ?? { won: 0, lost: 0, open: 0, revenue: 0 };

    if (TERMINAL_WON.includes(opp.stage)) {
      entry.won++;
      entry.revenue += opp.estimated_revenue ?? 0;
    } else if (TERMINAL_LOST.includes(opp.stage)) {
      entry.lost++;
    } else {
      entry.open++;
    }

    repMap.set(userId, entry);
  }

  return Array.from(repMap.entries())
    .map(([user_id, data]) => {
      const total = data.won + data.lost;
      return {
        user_id,
        deals_won: data.won,
        revenue_closed: data.revenue,
        deals_lost: data.lost,
        deals_open: data.open,
        conversion_rate: total > 0 ? data.won / total : 0,
        avg_deal_size: data.won > 0 ? data.revenue / data.won : 0,
      };
    })
    .sort((a, b) => b.revenue_closed - a.revenue_closed);
}

export function calculatePipelineAging(
  opportunities: RepOpportunityData[],
  stalledThresholdDays = 14,
): PipelineAgingEntry[] {
  const stageMap = new Map<string, { totalDays: number; count: number; stalledCount: number }>();
  const now = Date.now();

  for (const opp of opportunities) {
    if (TERMINAL_WON.includes(opp.stage) || TERMINAL_LOST.includes(opp.stage)) continue;

    const daysInStage = Math.floor(
      (now - new Date(opp.updated_at).getTime()) / (1000 * 60 * 60 * 24),
    );

    const entry = stageMap.get(opp.stage) ?? { totalDays: 0, count: 0, stalledCount: 0 };
    entry.totalDays += daysInStage;
    entry.count++;
    if (daysInStage > stalledThresholdDays) entry.stalledCount++;
    stageMap.set(opp.stage, entry);
  }

  return Array.from(stageMap.entries()).map(([stage, data]) => ({
    stage,
    avg_days: data.count > 0 ? Math.round((data.totalDays / data.count) * 10) / 10 : 0,
    count: data.count,
    stalled_count: data.stalledCount,
  }));
}

export function calculateWinLossAnalysis(
  opportunities: RepOpportunityData[],
  dimensionFn: (opp: RepOpportunityData) => string,
): WinLossEntry[] {
  const dimMap = new Map<string, { won: number; lost: number }>();

  for (const opp of opportunities) {
    if (!TERMINAL_WON.includes(opp.stage) && !TERMINAL_LOST.includes(opp.stage)) continue;

    const dim = dimensionFn(opp);
    const entry = dimMap.get(dim) ?? { won: 0, lost: 0 };

    if (TERMINAL_WON.includes(opp.stage)) {
      entry.won++;
    } else {
      entry.lost++;
    }

    dimMap.set(dim, entry);
  }

  return Array.from(dimMap.entries())
    .map(([dimension, data]) => ({
      dimension,
      won: data.won,
      lost: data.lost,
      total: data.won + data.lost,
      win_rate: data.won + data.lost > 0 ? data.won / (data.won + data.lost) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}
