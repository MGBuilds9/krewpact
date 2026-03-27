/**
 * CRM metrics type definitions.
 * Input data interfaces and output metric shapes.
 */

import type { SourceCategory } from '@/lib/crm/constants';

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

export interface ForecastOpportunityData {
  id: string;
  stage: string;
  estimated_revenue: number | null;
  probability_pct: number | null;
  target_close_date: string | null;
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
    category: SourceCategory;
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
