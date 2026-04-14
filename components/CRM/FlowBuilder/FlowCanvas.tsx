'use client';

import { useCallback, useMemo, useState } from 'react';

import { ConditionNode } from './ConditionNode';
import { FlowToolbar } from './FlowToolbar';
import { StepConfigPanel } from './StepConfigPanel';
import { StepNode } from './StepNode';
import { FlowConnection, FlowStep } from './types';

const NODE_HEIGHT = 72;
const NODE_GAP = 48;
const NODE_WIDTH = 360;
const CANVAS_X = 0;

interface FlowCanvasProps {
  sequenceId: string;
  initialSteps?: FlowStep[];
  onSave?: (steps: FlowStep[]) => void;
}

function computeConnections(steps: FlowStep[]): FlowConnection[] {
  const sorted = [...steps].sort((a, b) => a.step_number - b.step_number);
  const connections: FlowConnection[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (current.action_type === 'condition') {
      if (current.true_next_step_id)
        connections.push({
          from_step_id: current.id,
          to_step_id: current.true_next_step_id,
          label: 'Yes',
        });
      if (current.false_next_step_id)
        connections.push({
          from_step_id: current.id,
          to_step_id: current.false_next_step_id,
          label: 'No',
        });
      if (!current.true_next_step_id && !current.false_next_step_id)
        connections.push({ from_step_id: current.id, to_step_id: next.id, label: 'Yes' });
    } else {
      connections.push({ from_step_id: current.id, to_step_id: next.id });
    }
  }
  return connections;
}

function ConnectionLines({
  sorted,
  connections,
  svgHeight,
}: {
  sorted: FlowStep[];
  connections: FlowConnection[];
  svgHeight: number;
}) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0"
      width="100%"
      height={svgHeight + 20}
      aria-hidden="true"
    >
      {connections.map((conn) => {
        const fromIdx = sorted.findIndex((s) => s.id === conn.from_step_id);
        const toIdx = sorted.findIndex((s) => s.id === conn.to_step_id);
        if (fromIdx === -1 || toIdx === -1) return null;
        const isCondition = sorted[fromIdx].action_type === 'condition';
        const x = NODE_WIDTH / 2 + 16;
        const y1 = (fromIdx + 1) * (NODE_HEIGHT + NODE_GAP) - NODE_GAP + 8;
        const y2 = toIdx * (NODE_HEIGHT + NODE_GAP) + 8;
        const connKey = `${conn.from_step_id}-${conn.to_step_id}-${conn.label ?? ''}`;
        if (isCondition && conn.label) {
          const offsetX = conn.label === 'Yes' ? -40 : 40;
          const mx = x + offsetX;
          const my = (y1 + y2) / 2;
          const color = conn.label === 'Yes' ? '#10b981' : '#f87171';
          return (
            <g key={connKey}>
              <path
                d={`M ${x} ${y1} Q ${mx} ${my} ${x} ${y2}`}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              <text
                x={mx + (conn.label === 'Yes' ? -22 : 4)}
                y={my}
                fontSize={10}
                fill={color}
                fontWeight={600}
              >
                {conn.label}
              </text>
            </g>
          );
        }
        return (
          <line key={connKey} x1={x} y1={y1} x2={x} y2={y2} stroke="#94a3b8" strokeWidth={1.5} />
        );
      })}
    </svg>
  );
}

interface CanvasStepsProps {
  sorted: FlowStep[];
  connections: FlowConnection[];
  svgHeight: number;
  selectedStepId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

function CanvasSteps({
  sorted,
  connections,
  svgHeight,
  selectedStepId,
  onSelect,
  onRemove,
}: CanvasStepsProps) {
  if (sorted.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p className="text-sm font-medium">No steps yet</p>
        <p className="text-xs">
          Use the toolbar above to add email, task, wait, or condition steps.
        </p>
      </div>
    );
  }
  return (
    <div className="relative" style={{ minHeight: svgHeight + 20 }}>
      <ConnectionLines sorted={sorted} connections={connections} svgHeight={svgHeight} />
      <div className="relative z-10 flex flex-col gap-3" style={{ maxWidth: NODE_WIDTH }}>
        {sorted.map((step) => {
          const isSelected = step.id === selectedStepId;
          if (step.action_type === 'condition')
            return (
              <ConditionNode
                key={step.id}
                step={step}
                selected={isSelected}
                onSelect={() => onSelect(step.id)}
                onDelete={() => onRemove(step.id)}
              />
            );
          return (
            <StepNode
              key={step.id}
              step={step}
              selected={isSelected}
              onSelect={() => onSelect(step.id)}
              onDelete={() => onRemove(step.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

export function FlowCanvas({
  sequenceId: _sequenceId,
  initialSteps = [],
  onSave,
}: FlowCanvasProps) {
  const [steps, setSteps] = useState<FlowStep[]>(initialSteps);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sorted = useMemo(() => [...steps].sort((a, b) => a.step_number - b.step_number), [steps]);
  const connections = useMemo(() => computeConnections(steps), [steps]);

  const addStep = useCallback(
    (type: FlowStep['action_type']) => {
      const maxNum = steps.length > 0 ? Math.max(...steps.map((s) => s.step_number)) : 0;
      const newStep: FlowStep = {
        id: crypto.randomUUID(),
        step_number: maxNum + 1,
        action_type: type,
        action_config: {},
        condition_type: null,
        condition_config: null,
        true_next_step_id: null,
        false_next_step_id: null,
        position_x: CANVAS_X,
        position_y: maxNum * (NODE_HEIGHT + NODE_GAP),
        delay_days: type === 'wait' ? 1 : undefined,
        delay_hours: type === 'wait' ? 0 : undefined,
      };
      setSteps((prev) => [...prev, newStep]);
      setSelectedStepId(newStep.id);
    },
    [steps],
  );

  const removeStep = useCallback((id: string) => {
    setSteps((prev) =>
      prev
        .filter((s) => s.id !== id)
        .sort((a, b) => a.step_number - b.step_number)
        .map((s, i) => ({ ...s, step_number: i + 1, position_y: i * (NODE_HEIGHT + NODE_GAP) })),
    );
    setSelectedStepId((prev) => (prev === id ? null : prev));
  }, []);

  const updateStep = useCallback((id: string, changes: Partial<FlowStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...changes } : s)));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      onSave?.(steps);
    } finally {
      setSaving(false);
    }
  }, [steps, onSave]);

  const selectedStep = selectedStepId ? (steps.find((s) => s.id === selectedStepId) ?? null) : null;
  const svgHeight = Math.max(sorted.length * (NODE_HEIGHT + NODE_GAP), 100);

  return (
    <div className="flex flex-col gap-3">
      <FlowToolbar onAddStep={addStep} onSave={handleSave} saving={saving} />
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative min-h-[400px] flex-1 rounded-lg border bg-muted/30 p-4">
          <CanvasSteps
            sorted={sorted}
            connections={connections}
            svgHeight={svgHeight}
            selectedStepId={selectedStepId}
            onSelect={setSelectedStepId}
            onRemove={removeStep}
          />
        </div>
        {selectedStep && (
          <StepConfigPanel
            step={selectedStep}
            onUpdate={(changes) => updateStep(selectedStep.id, changes)}
            onClose={() => setSelectedStepId(null)}
          />
        )}
      </div>
    </div>
  );
}
