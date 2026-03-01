'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { OpportunityCard } from '@/components/CRM/OpportunityCard';
import { WeightedPipelineHeader } from '@/components/CRM/WeightedPipelineHeader';
import { Briefcase } from 'lucide-react';
import type { PipelineData, Opportunity } from '@/hooks/useCRM';

const STAGE_ORDER = [
  'intake',
  'site_visit',
  'estimating',
  'proposal',
  'negotiation',
  'contracted',
  'closed_lost',
] as const;

function formatStage(stage: string): string {
  return stage
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

function calculateWeightedValue(opportunities: Opportunity[]): number {
  return opportunities.reduce((sum, opp) => {
    const revenue = opp.estimated_revenue ?? 0;
    const probability = opp.probability_pct ?? 0;
    return sum + (revenue * probability) / 100;
  }, 0);
}

interface PipelineViewProps {
  data: PipelineData;
}

export function PipelineView({ data }: PipelineViewProps) {
  const router = useRouter();

  const stageKeys = Object.keys(data.stages);
  if (stageKeys.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Briefcase className="mx-auto h-12 w-12 opacity-50 mb-4" />
        <h3 className="text-lg font-medium mb-2">No opportunities in pipeline</h3>
        <p>Create opportunities from your leads to see them here</p>
      </div>
    );
  }

  // Use STAGE_ORDER for known stages, then append any extra stages from data
  const orderedStages = STAGE_ORDER.filter((s) => s in data.stages);
  const extraStages = stageKeys.filter((s) => !STAGE_ORDER.includes(s as typeof STAGE_ORDER[number]));
  const allStages = [...orderedStages, ...extraStages];

  // Calculate pipeline metrics
  const allOpportunities = Object.values(data.stages).flatMap((s) => s.opportunities);
  const totalValue = Object.values(data.stages).reduce((sum, s) => sum + s.total_value, 0);
  const weightedValue = calculateWeightedValue(allOpportunities);
  const opportunityCount = allOpportunities.length;

  return (
    <>
    <WeightedPipelineHeader
      totalValue={totalValue}
      weightedValue={weightedValue}
      opportunityCount={opportunityCount}
    />
    <div className="flex gap-4 overflow-x-auto pb-4">
      {allStages.map((stage) => {
        const stageData = data.stages[stage];
        if (!stageData) return null;

        return (
          <div
            key={stage}
            className="flex-shrink-0 w-64 bg-muted/30 rounded-lg p-3"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">{formatStage(stage)}</h3>
              <Badge variant="secondary" className="text-xs">
                {stageData.count}
              </Badge>
            </div>
            {stageData.total_value > 0 && (
              <p className="text-xs text-muted-foreground mb-1">
                {formatCurrency(stageData.total_value)}
              </p>
            )}
            {stageData.opportunities.length > 0 && (
              <p className="text-xs text-muted-foreground mb-3">
                weighted: {formatCurrency(calculateWeightedValue(stageData.opportunities))}
              </p>
            )}

            {/* Opportunity Cards */}
            <div className="space-y-2">
              {stageData.opportunities.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  onClick={() => router.push(`/crm/opportunities/${opp.id}`)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}
