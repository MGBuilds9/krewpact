'use client';

import { Plus, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

import { PipelineKanban } from '@/components/CRM/PipelineKanban';
import { WeightedPipelineHeader } from '@/components/CRM/WeightedPipelineHeader';
import { Button } from '@/components/ui/button';
import { useDivision } from '@/contexts/DivisionContext';
import { usePipeline } from '@/hooks/useCRM';
import { useOrgRouter } from '@/hooks/useOrgRouter';

export default function OpportunitiesView() {
  const { activeDivision } = useDivision();
  const { push: orgPush } = useOrgRouter();

  const { data: pipelineData } = usePipeline({
    divisionId: activeDivision?.id,
  });

  const { totalOpps, totalValue, weightedValue } = useMemo(() => {
    if (!pipelineData) return { totalOpps: 0, totalValue: 0, weightedValue: 0 };
    let opps = 0;
    let val = 0;
    let weighted = 0;
    for (const stage of Object.values(pipelineData.stages)) {
      opps += stage.count;
      val += stage.total_value;
      for (const opp of stage.opportunities) {
        weighted += (opp.estimated_revenue ?? 0) * ((opp.probability_pct ?? 0) / 100);
      }
    }
    return { totalOpps: opps, totalValue: val, weightedValue: weighted };
  }, [pipelineData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
            <p className="text-muted-foreground text-sm">
              {totalOpps} opportunit{totalOpps !== 1 ? 'ies' : 'y'}
            </p>
          </div>
        </div>
        <Button onClick={() => orgPush('/crm/opportunities/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Opportunity
        </Button>
      </div>
      <WeightedPipelineHeader
        totalValue={totalValue}
        weightedValue={weightedValue}
        opportunityCount={totalOpps}
      />
      <PipelineKanban data={pipelineData ?? { stages: {} }} />
    </div>
  );
}
