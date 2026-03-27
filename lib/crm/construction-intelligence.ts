/**
 * Pure computation functions for construction-specific intelligence:
 * - Division comparison (pipeline, revenue, velocity per division)
 * - Seasonal pipeline analysis (quarterly trends)
 */

export interface DivisionOpportunity {
  id: string;
  division_id: string | null;
  stage: string;
  estimated_revenue: number | null;
  created_at: string;
  updated_at: string;
}

export interface DivisionComparison {
  division_id: string;
  total_opportunities: number;
  total_pipeline_value: number;
  won_count: number;
  won_revenue: number;
  lost_count: number;
  active_count: number;
  win_rate: number;
  avg_deal_size: number;
}

const TERMINAL_WON = ['contracted'];
const TERMINAL_LOST = ['closed_lost'];

export function calculateDivisionComparison(
  opportunities: DivisionOpportunity[],
): DivisionComparison[] {
  const byDivision = new Map<string, DivisionOpportunity[]>();

  for (const opp of opportunities) {
    const div = opp.division_id ?? 'unassigned';
    const arr = byDivision.get(div) ?? [];
    arr.push(opp);
    byDivision.set(div, arr);
  }

  const results: DivisionComparison[] = [];

  for (const [divId, opps] of byDivision) {
    const won = opps.filter((o) => TERMINAL_WON.includes(o.stage));
    const lost = opps.filter((o) => TERMINAL_LOST.includes(o.stage));
    const active = opps.filter(
      (o) => !TERMINAL_WON.includes(o.stage) && !TERMINAL_LOST.includes(o.stage),
    );
    const totalRev = opps.reduce((s, o) => s + (o.estimated_revenue ?? 0), 0);
    const wonRev = won.reduce((s, o) => s + (o.estimated_revenue ?? 0), 0);
    const decided = won.length + lost.length;

    results.push({
      division_id: divId,
      total_opportunities: opps.length,
      total_pipeline_value: totalRev,
      won_count: won.length,
      won_revenue: wonRev,
      lost_count: lost.length,
      active_count: active.length,
      win_rate: decided > 0 ? Math.round((won.length / decided) * 100) : 0,
      avg_deal_size: opps.length > 0 ? Math.round(totalRev / opps.length) : 0,
    });
  }

  return results.sort((a, b) => b.won_revenue - a.won_revenue);
}

export interface QuarterlyData {
  quarter: string; // "2026-Q1"
  created: number;
  won: number;
  lost: number;
  revenue: number;
}

export function calculateSeasonalAnalysis(opportunities: DivisionOpportunity[]): QuarterlyData[] {
  const quarterMap = new Map<
    string,
    { created: number; won: number; lost: number; revenue: number }
  >();

  for (const opp of opportunities) {
    const date = new Date(opp.created_at);
    const year = date.getFullYear();
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    const key = `${year}-Q${quarter}`;

    const entry = quarterMap.get(key) ?? { created: 0, won: 0, lost: 0, revenue: 0 };
    entry.created++;
    entry.revenue += opp.estimated_revenue ?? 0;

    if (TERMINAL_WON.includes(opp.stage)) entry.won++;
    if (TERMINAL_LOST.includes(opp.stage)) entry.lost++;

    quarterMap.set(key, entry);
  }

  return Array.from(quarterMap.entries())
    .map(([quarter, data]) => ({ quarter, ...data }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter));
}
