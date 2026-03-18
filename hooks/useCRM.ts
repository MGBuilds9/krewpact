'use client';

// Re-exports from split CRM hook files.
// This file replaces the original monolith — all existing imports continue to work.

export type { PaginatedResponse } from './crm/types';
export type {
  Account,
  AccountHealthResponse,
  AccountRevenueResponse,
  ProjectHistory,
} from './crm/useAccounts';
export {
  useAccount,
  useAccountHealth,
  useAccountProjects,
  useAccountRevenue,
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useMergeAccounts,
  useUpdateAccount,
} from './crm/useAccounts';
export type { Activity } from './crm/useActivities';
export {
  useActivities,
  useAutoLogActivity,
  useCompleteTask,
  useCreateActivity,
  useMyTasks,
  useOverdueTasks,
  useSendEmail,
  useTimeline,
} from './crm/useActivities';
export type { Contact } from './crm/useContacts';
export {
  useContact,
  useContacts,
  useCreateContact,
  useDeleteContact,
  useMergeContacts,
  useUpdateContact,
} from './crm/useContacts';
export type { BiddingOpportunity, ICP, SequenceDefaults, SLASettings } from './crm/useCRMSettings';
export {
  useBiddingOpportunities,
  useBiddingOpportunity,
  useCreateBidding,
  useDeleteBidding,
  useGenerateICPs,
  useICP,
  useICPs,
  useImportBidding,
  useLinkBiddingToOpportunity,
  useMatchLeadsToICPs,
  useSequenceDefaults,
  useSLASettings,
  useUpdateBidding,
  useUpdateSequenceDefaults,
  useUpdateSLASettings,
} from './crm/useCRMSettings';
export type { EnrichmentConfig, EnrichmentJob, EnrichmentStats } from './crm/useEnrichment';
export {
  useEnrichmentConfig,
  useEnrichmentJobs,
  useEnrichmentStats,
  useRetryEnrichment,
  useUpdateEnrichmentConfig,
} from './crm/useEnrichment';
export type { Lead } from './crm/useLeads';
export {
  useBulkEmail,
  useConvertLead,
  useCreateLead,
  useDeleteLead,
  useLead,
  useLeads,
  useLeadStageTransition,
  useUpdateLead,
} from './crm/useLeads';
export type {
  LeadAccountMatch,
  RuleResultDisplay,
  ScoreBreakdown,
  ScoreHistory,
  ScoringRule,
} from './crm/useLeadScoring';
export {
  useConfirmLeadAccountMatch,
  useCreateScoringRule,
  useDeleteScoringRule,
  useLeadAccountMatches,
  useLeadScore,
  useLeadScoreBreakdown,
  useRecalculateLeadScore,
  useScoringRules,
  useUpdateScoringRule,
} from './crm/useLeadScoring';
export type {
  DivisionComparisonResponse,
  Opportunity,
  PipelineData,
  PipelineIntelligenceResponse,
  StageHistoryEntry,
} from './crm/useOpportunities';
export {
  useCreateLinkedEstimate,
  useCreateOpportunity,
  useDashboardMetrics,
  useDeleteOpportunity,
  useDivisionComparison,
  useMarkOpportunityLost,
  useMarkOpportunityWon,
  useOpportunities,
  useOpportunity,
  useOpportunityEstimates,
  useOpportunityStageTransition,
  usePipeline,
  usePipelineIntelligence,
  useProposalData,
  useUpdateOpportunity,
} from './crm/useOpportunities';
export type { OutreachEvent, Sequence, SequenceEnrollment, SequenceStep } from './crm/useSequences';
export {
  useCreateOutreach,
  useCreateSequence,
  useCreateSequenceStep,
  useDeleteSequence,
  useDeleteSequenceStep,
  useEnrollInSequence,
  useOutreachHistory,
  useProcessSequences,
  useSequence,
  useSequenceAnalytics,
  useSequenceEnrollments,
  useSequences,
  useSequenceSteps,
  useUpdateSequence,
} from './crm/useSequences';
