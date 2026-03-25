'use client';

import { CheckCircle, Circle, Clock, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type COStatus = 'draft' | 'submitted' | 'client_review' | 'approved' | 'rejected' | 'void';

export interface COApprovalStep {
  label: string;
  status: 'completed' | 'active' | 'pending' | 'rejected';
  timestamp?: string | null;
  actor?: string | null;
  note?: string | null;
}

interface COApprovalChainProps {
  coStatus: COStatus;
  approvedAt?: string | null;
  approvedBy?: string | null;
  rejectionReason?: string | null;
  className?: string;
}

function buildSteps(
  coStatus: COStatus,
  approvedAt?: string | null,
  approvedBy?: string | null,
  rejectionReason?: string | null,
): COApprovalStep[] {
  const isRejected = coStatus === 'rejected';
  const statusOrder: COStatus[] = ['draft', 'submitted', 'client_review', 'approved'];
  const currentIndex = isRejected ? -1 : statusOrder.indexOf(coStatus);

  function stepStatus(idx: number): COApprovalStep['status'] {
    if (isRejected) return idx === 0 ? 'completed' : 'rejected';
    if (idx < currentIndex) return 'completed';
    if (idx === currentIndex) return 'active';
    return 'pending';
  }

  return [
    {
      label: 'Draft Created',
      status: stepStatus(0),
    },
    {
      label: 'Submitted for Approval',
      status: stepStatus(1),
    },
    {
      label: 'Client Review',
      status: stepStatus(2),
      note: isRejected ? rejectionReason ?? null : null,
    },
    {
      label: 'Approved',
      status: stepStatus(3),
      timestamp: approvedAt ?? null,
      actor: approvedBy ?? null,
    },
  ];
}

function StepIcon({ status }: { status: COApprovalStep['status'] }) {
  if (status === 'completed') return <CheckCircle className="h-5 w-5 text-green-600" />;
  if (status === 'active') return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
  if (status === 'rejected') return <XCircle className="h-5 w-5 text-red-600" />;
  return <Circle className="h-5 w-5 text-muted-foreground" />;
}

export function COApprovalChain({
  coStatus,
  approvedAt,
  approvedBy,
  rejectionReason,
  className,
}: COApprovalChainProps) {
  const steps = buildSteps(coStatus, approvedAt, approvedBy, rejectionReason);
  const isRejected = coStatus === 'rejected';

  return (
    <div className={cn('space-y-1', className)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">Approval Workflow</span>
        {isRejected && (
          <Badge variant="destructive" className="text-xs">
            Rejected
          </Badge>
        )}
        {coStatus === 'approved' && (
          <Badge variant="default" className="bg-green-600 text-xs text-white">
            Approved
          </Badge>
        )}
      </div>
      <ol className="relative border-l border-border ml-2.5">
        {steps.map((step, idx) => (
          <li key={idx} className="mb-6 ml-6 last:mb-0">
            <span
              className={cn(
                'absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background ring-2',
                step.status === 'completed' && 'ring-green-500',
                step.status === 'active' && 'ring-blue-500',
                step.status === 'rejected' && 'ring-red-500',
                step.status === 'pending' && 'ring-border',
              )}
            >
              <StepIcon status={step.status} />
            </span>
            <div className="pl-1">
              <p
                className={cn(
                  'text-sm font-medium',
                  step.status === 'pending' && 'text-muted-foreground',
                  step.status === 'rejected' && 'text-red-600',
                )}
              >
                {step.label}
              </p>
              {step.actor && (
                <p className="mt-0.5 text-xs text-muted-foreground">by {step.actor}</p>
              )}
              {step.timestamp && (
                <time className="mt-0.5 block text-xs text-muted-foreground">
                  {new Date(step.timestamp).toLocaleString()}
                </time>
              )}
              {step.note && (
                <p className="mt-1 text-xs text-red-600 italic">{step.note}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
