'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { usePipeline } from '@/hooks/useCRM';
import { useDivision } from '@/contexts/DivisionContext';
import { PipelineView } from '@/components/CRM/PipelineView';

export default function OpportunitiesPage() {
  const { activeDivision } = useDivision();

  const { data: pipelineData, isLoading } = usePipeline({
    divisionId: activeDivision?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-64 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PipelineView data={pipelineData ?? { stages: {} }} />
    </div>
  );
}
