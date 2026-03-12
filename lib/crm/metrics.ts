/**
 * CRM Dashboard metrics — pure calculation functions.
 * No database or auth dependencies.
 */

// --- Input data interfaces (minimal fields needed for calculations) ---

export interface OpportunityData {
  id: string;
  stage: string;
  estimated_revenue: number | null;
  probability_pct: number | null;
  created_at: string;
  updated_at: string;
  /** Only present on won deals */
  won_date?: string | null;
  opportunity_stage_history?: StageHistoryData[];
}

export interface StageHistoryData {
  from_stage: string;
  to_stage: string;
  created_at: string;
}

export interface LeadData {
  id: string;
  status: string;
  source_channel: string | null;
  created_at: string;
}

// --- Output interfaces ---

export interface PipelineMetrics {
  totalPipelineValue: number;
  weightedPipelineValue: number;
  opportunityCount: number;
  averageDealSize: number;
  stageBreakdown: {
    stage: string;
    count: number;
    value: number;
    weightedValue: number;
  }[];
}

export interface ConversionMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  lostLeads: number;
  qualificationRate: number;
  conversionRate: number;
  lossRate: number;
}

export interface VelocityMetrics {
  averageDaysToClose: number;
  averageDaysInStage: Record<string, number>;
  dealsClosed: number;
  dealsClosedValue: number;
}

export interface SourceMetrics {
  sources: {
    source: string;
    count: number;
    value: number;
    conversionRate: number;
  }[];
}

export interface ForecastBucket {
  month: string; // YYYY-MM format
  label: string; // e.g., "Mar 2026"
  dealCount: number;
  totalRevenue: number;
  weightedRevenue: number;
}

export interface ForecastMetrics {
  buckets: ForecastBucket[];
  totalForecastedRevenue: number;
  totalWeightedRevenue: number;
}

export interface DashboardMetrics {
  pipeline: PipelineMetrics;
  conversion: ConversionMetrics;
  velocity: VelocityMetrics;
  sources: SourceMetrics;
  forecast: ForecastMetrics;
}

// --- Stage definitions ---

const ACTIVE_STAGES = [
  'intake',
  'site_visit',
  'estimating',
  'proposal',
  'negotiation',
  'contracted',
];

const TERMINAL_STAGES = ['contracted', 'closed_lost'];

// --- Pure functions ---

export function calculatePipelineMetrics(opportunities: OpportunityData[]): PipelineMetrics {
  // Only count active pipeline (exclude terminal states)
  const active = opportunities.filter((o) => !TERMINAL_STAGES.includes(o.stage));

  const stageMap = new Map<string, { count: number; value: number; weightedValue: number }>();

  for (const stage of ACTIVE_STAGES) {
    stageMap.set(stage, { count: 0, value: 0, weightedValue: 0 });
  }

  let totalValue = 0;
  let weightedValue = 0;

  for (const opp of active) {
    const revenue = opp.estimated_revenue ?? 0;
    const probability = (opp.probability_pct ?? 0) / 100;
    const weighted = revenue * probability;

    totalValue += revenue;
    weightedValue += weighted;

    const entry = stageMap.get(opp.stage);
    if (entry) {
      entry.count += 1;
      entry.value += revenue;
      entry.weightedValue += weighted;
    } else {
      stageMap.set(opp.stage, {
        count: 1,
        value: revenue,
        weightedValue: weighted,
      });
    }
  }

  const stageBreakdown = Array.from(stageMap.entries()).map(([stage, data]) => ({
    stage,
    count: data.count,
    value: data.value,
    weightedValue: data.weightedValue,
  }));

  return {
    totalPipelineValue: totalValue,
    weightedPipelineValue: weightedValue,
    opportunityCount: active.length,
    averageDealSize: active.length > 0 ? totalValue / active.length : 0,
    stageBreakdown,
  };
}

export function calculateConversionMetrics(leads: LeadData[]): ConversionMetrics {
  const total = leads.length;

  // Qualified = any stage beyond 'new' and 'contacted'
  const qualifiedStages = ['qualified', 'won', 'proposal', 'negotiation'];
  const wonStages = ['won'];
  const lostStages = ['lost'];

  const qualified = leads.filter(
    (l) => qualifiedStages.includes(l.status) || wonStages.includes(l.status),
  ).length;

  const won = leads.filter((l) => wonStages.includes(l.status)).length;

  const lost = leads.filter((l) => lostStages.includes(l.status)).length;

  return {
    totalLeads: total,
    qualifiedLeads: qualified,
    convertedLeads: won,
    lostLeads: lost,
    qualificationRate: total > 0 ? qualified / total : 0,
    conversionRate: total > 0 ? won / total : 0,
    lossRate: total > 0 ? lost / total : 0,
  };
}

export function calculateVelocityMetrics(opportunities: OpportunityData[]): VelocityMetrics {
  const wonDeals = opportunities.filter((o) => o.stage === 'contracted');

  let totalDaysToClose = 0;
  let dealsWithCloseTime = 0;
  let dealsClosedValue = 0;

  const stageDaysMap = new Map<string, { totalDays: number; count: number }>();

  for (const opp of wonDeals) {
    dealsClosedValue += opp.estimated_revenue ?? 0;

    // Calculate days to close from created_at to won_date or updated_at
    const startDate = new Date(opp.created_at);
    const endDate = new Date(opp.won_date ?? opp.updated_at);
    const daysToClose = Math.max(
      0,
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    totalDaysToClose += daysToClose;
    dealsWithCloseTime += 1;

    // Calculate time per stage from history
    if (opp.opportunity_stage_history && opp.opportunity_stage_history.length > 0) {
      const sortedHistory = [...opp.opportunity_stage_history].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      for (let i = 0; i < sortedHistory.length; i++) {
        const entry = sortedHistory[i];
        const stageStart =
          i === 0 ? new Date(opp.created_at) : new Date(sortedHistory[i - 1].created_at);
        const stageEnd = new Date(entry.created_at);
        const days = Math.max(
          0,
          (stageEnd.getTime() - stageStart.getTime()) / (1000 * 60 * 60 * 24),
        );

        const existing = stageDaysMap.get(entry.from_stage);
        if (existing) {
          existing.totalDays += days;
          existing.count += 1;
        } else {
          stageDaysMap.set(entry.from_stage, { totalDays: days, count: 1 });
        }
      }
    }
  }

  const averageDaysInStage: Record<string, number> = {};
  for (const [stage, data] of stageDaysMap.entries()) {
    averageDaysInStage[stage] =
      data.count > 0 ? Math.round((data.totalDays / data.count) * 10) / 10 : 0;
  }

  return {
    averageDaysToClose:
      dealsWithCloseTime > 0 ? Math.round((totalDaysToClose / dealsWithCloseTime) * 10) / 10 : 0,
    averageDaysInStage,
    dealsClosed: wonDeals.length,
    dealsClosedValue,
  };
}

export function calculateSourceMetrics(leads: LeadData[]): SourceMetrics {
  const sourceMap = new Map<string, { count: number; value: number; converted: number }>();

  for (const lead of leads) {
    const source = lead.source_channel ?? 'Unknown';
    const existing = sourceMap.get(source);
    const isConverted = lead.status === 'won';

    if (existing) {
      existing.count += 1;
      existing.value += 0;
      if (isConverted) existing.converted += 1;
    } else {
      sourceMap.set(source, {
        count: 1,
        value: 0,
        converted: isConverted ? 1 : 0,
      });
    }
  }

  const sources = Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      count: data.count,
      value: data.value,
      conversionRate: data.count > 0 ? data.converted / data.count : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return { sources };
}

export interface ForecastOpportunityData {
  id: string;
  stage: string;
  estimated_revenue: number | null;
  probability_pct: number | null;
  target_close_date: string | null;
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Groups open opportunities by target_close_date month,
 * weighted by probability. Returns 6 months of forecast from now.
 */
export function calculateForecastMetrics(
  opportunities: ForecastOpportunityData[],
  now: Date = new Date(),
  monthsAhead: number = 6,
): ForecastMetrics {
  // Only include active (non-terminal) opportunities with a close date
  const active = opportunities.filter(
    (o) => !TERMINAL_STAGES.includes(o.stage) && o.target_close_date,
  );

  // Build month buckets
  const bucketMap = new Map<string, ForecastBucket>();
  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
    bucketMap.set(key, { month: key, label, dealCount: 0, totalRevenue: 0, weightedRevenue: 0 });
  }

  let totalForecastedRevenue = 0;
  let totalWeightedRevenue = 0;

  for (const opp of active) {
    const closeDate = new Date(opp.target_close_date!);
    const key = `${closeDate.getFullYear()}-${String(closeDate.getMonth() + 1).padStart(2, '0')}`;
    const revenue = opp.estimated_revenue ?? 0;
    const probability = (opp.probability_pct ?? 0) / 100;
    const weighted = revenue * probability;

    const bucket = bucketMap.get(key);
    if (bucket) {
      bucket.dealCount++;
      bucket.totalRevenue += revenue;
      bucket.weightedRevenue += weighted;
    }

    totalForecastedRevenue += revenue;
    totalWeightedRevenue += weighted;
  }

  return {
    buckets: Array.from(bucketMap.values()),
    totalForecastedRevenue,
    totalWeightedRevenue,
  };
}
