'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { useOpportunity } from '@/hooks/useCRM';
import type { OpportunityStage } from '@/lib/crm/opportunity-stages';
import { formatStatus } from '@/lib/format-status';

import { DealSummaryCard } from './DealSummaryCard';

type OppData = NonNullable<ReturnType<typeof useOpportunity>['data']>;

interface StageHistoryEntry {
  id: string;
  from_stage: string;
  to_stage: string;
  created_at: string;
}

function StageHistoryCard({ history }: { history: StageHistoryEntry[] }) {
  if (!history.length) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Stage History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between text-sm">
              <div>
                <span className="capitalize text-muted-foreground">
                  {formatStatus(entry.from_stage)}
                </span>
                <span className="mx-1.5 text-muted-foreground">&rarr;</span>
                <span className="font-medium">{formatStatus(entry.to_stage)}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.created_at).toLocaleDateString('en-CA', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface OppSidePanelProps {
  opp: OppData;
  currentStage: OpportunityStage;
  activityCount: number;
  estimateCount: number;
  stageHistory: StageHistoryEntry[];
}

export function OppSidePanel({
  opp,
  currentStage,
  activityCount,
  estimateCount,
  stageHistory,
}: OppSidePanelProps) {
  return (
    <div className="space-y-6">
      <DealSummaryCard
        opp={opp}
        currentStage={currentStage}
        activityCount={activityCount}
        estimateCount={estimateCount}
      />
      <StageHistoryCard history={stageHistory} />
    </div>
  );
}
