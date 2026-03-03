'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { usePipeline } from '@/hooks/useCRM';
import { useDivision } from '@/contexts/DivisionContext';
import { PipelineView } from '@/components/CRM/PipelineView';
import { TrendingUp } from 'lucide-react';

export default function OpportunitiesPage() {
  const { activeDivision } = useDivision();

  const { data: pipelineData, isLoading } = usePipeline({
    divisionId: activeDivision?.id,
  });

  // Count total opportunities across stages
  const totalOpps = pipelineData
    ? Object.values(pipelineData.stages).reduce((sum, stage) => sum + stage.count, 0)
    : 0;

  const totalValue = pipelineData
    ? Object.values(pipelineData.stages).reduce((sum, stage) => sum + stage.total_value, 0)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-64 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <title>Opportunities — KrewPact</title>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
            <p className="text-muted-foreground text-sm">
              {totalOpps} opportunit{totalOpps !== 1 ? 'ies' : 'y'}
              {totalValue > 0 && (
                <>
                  <span className="mx-1.5">&middot;</span>
                  <span className="text-green-600 font-medium">
                    {new Intl.NumberFormat('en-CA', {
                      style: 'currency',
                      currency: 'CAD',
                      maximumFractionDigits: 0,
                    }).format(totalValue)}{' '}
                    total value
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <PipelineView data={pipelineData ?? { stages: {} }} />
      </div>
    </>
  );
}
