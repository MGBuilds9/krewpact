export { detectBidMatches } from './agents/bid-matcher';
export { detectBudgetAnomalies } from './agents/budget-anomaly';
export { buildDigest } from './agents/digest-builder';
export type { DraftType } from './agents/email-drafter';
export { draftEmail } from './agents/email-drafter';
export { generateInsights } from './agents/insight-engine';
export { detectNextActions } from './agents/next-action-suggester';
export { executeNLQuery } from './agents/nl-query';
export { detectStaleDeals } from './agents/stale-deal-detector';
export { trackAIAction } from './cost-tracker';
export { generateWithGemini } from './providers/gemini';
export { getAIProvider } from './router';
export { executeToolCall, queryTools } from './tools';
export type {
  AITask,
  CostEntry,
  EntityType,
  GeneratedInsight,
  InsightInput,
  InsightType,
} from './types';
