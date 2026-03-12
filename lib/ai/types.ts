export type AITask = 'nudge' | 'draft' | 'summarize' | 'query' | 'embed';

export type InsightType =
  | 'stale_deal'
  | 'bid_match'
  | 'budget_alert'
  | 'enrichment_update'
  | 'next_action'
  | 'follow_up_due'
  | 'score_change'
  | 'icp_fit'
  | 'company_news';

export type EntityType = 'lead' | 'opportunity' | 'project' | 'account' | 'task';

export interface AIProviderConfig {
  provider: 'google' | 'anthropic' | 'openai';
  model: string;
}

export interface InsightInput {
  entityType: EntityType;
  entityId: string;
  orgId: string;
  insightType: InsightType;
  detectionData: Record<string, unknown>;
}

export interface GeneratedInsight {
  title: string;
  content: string;
  confidence: number;
  actionUrl?: string | null;
  actionLabel?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CostEntry {
  orgId: string;
  userId?: string;
  actionType: string;
  entityType?: EntityType;
  entityId?: string;
  modelUsed: string;
  inputTokens?: number;
  outputTokens?: number;
  costCents?: number;
  latencyMs?: number;
}
