'use client';

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Briefcase } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { OpportunityCard } from '@/components/CRM/OpportunityCard';
import { Badge } from '@/components/ui/badge';
import type { Opportunity, PipelineData } from '@/hooks/useCRM';
import { useOpportunityStageTransition } from '@/hooks/useCRM';

const STAGE_ORDER = [
  'intake',
  'site_visit',
  'estimating',
  'proposal',
  'negotiation',
  'contracted',
  'closed_won',
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

function DraggableCard({
  opportunity,
  onClick,
}: {
  opportunity: Opportunity;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
    data: { opportunity },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <OpportunityCard opportunity={opportunity} onClick={onClick} />
    </div>
  );
}

function DroppableColumn({
  stage,
  stageData,
  children,
}: {
  stage: string;
  stageData: { count: number; total_value: number; opportunities: Opportunity[] };
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-2xl p-4 border flex flex-col h-full max-h-[80vh] transition-colors ${
        isOver ? 'bg-primary/5 border-primary/30' : 'bg-gray-50/50 dark:bg-card/30 border-border/40'
      }`}
    >
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
      <div className="space-y-3 overflow-y-auto pr-1 pb-2 custom-scrollbar flex-1">{children}</div>
    </div>
  );
}

interface PipelineKanbanProps {
  data: PipelineData;
}

function PipelineEmpty(): React.ReactElement {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Briefcase className="mx-auto h-12 w-12 opacity-50 mb-4" />
      <h3 className="text-lg font-medium mb-2">No opportunities in pipeline</h3>
      <p>Create opportunities from your leads to see them here</p>
    </div>
  );
}

export function PipelineKanban({ data }: PipelineKanbanProps) {
  const router = useRouter();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const stageTransition = useOpportunityStageTransition();
  const [activeOpp, setActiveOpp] = useState<Opportunity | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const stageKeys = Object.keys(data.stages);
  if (stageKeys.length === 0) return <PipelineEmpty />;

  const orderedStages = STAGE_ORDER.filter((s) => s in data.stages);
  const extraStages = stageKeys.filter(
    (s) => !STAGE_ORDER.includes(s as (typeof STAGE_ORDER)[number]),
  );
  const allStages = [...orderedStages, ...extraStages];
  const allOpportunities = Object.values(data.stages).flatMap((s) => s.opportunities);

  function handleDragStart(event: DragStartEvent) {
    setActiveOpp((event.active.data.current?.opportunity as Opportunity | undefined) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveOpp(null);
    const { active, over } = event;
    if (!over) return;
    const opp = allOpportunities.find((o) => o.id === (active.id as string));
    if (!opp || opp.stage === (over.id as string)) return;
    stageTransition.mutate({ id: active.id as string, stage: over.id as string });
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {allStages.map((stage) => {
            const stageData = data.stages[stage];
            if (!stageData) return null;
            return (
              <DroppableColumn key={stage} stage={stage} stageData={stageData}>
                {stageData.opportunities.map((opp) => (
                  <DraggableCard
                    key={opp.id}
                    opportunity={opp}
                    onClick={() => router.push(`/org/${orgSlug}/crm/opportunities/${opp.id}`)}
                  />
                ))}
              </DroppableColumn>
            );
          })}
        </div>
        <DragOverlay>
          {activeOpp && (
            <div className="opacity-80 rotate-2 shadow-lg">
              <OpportunityCard opportunity={activeOpp} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}
