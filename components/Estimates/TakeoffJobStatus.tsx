'use client';

import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCancelTakeoffJob, useTakeoffJobStatus } from '@/hooks/useTakeoff';
import type { TakeoffJobStatus as JobStatusType } from '@/lib/takeoff/types';
import { ACTIVE_JOB_STATUSES } from '@/lib/takeoff/types';

interface TakeoffJobStatusProps {
  estimateId: string;
  jobId: string;
  onComplete: () => void;
}

const STEP_ORDER: JobStatusType[] = [
  'pending',
  'processing',
  'classifying',
  'extracting',
  'costing',
  'completed',
];

const STEP_LABELS: Record<string, string> = {
  pending: 'Queued',
  processing: 'Processing',
  classifying: 'Classifying Pages',
  extracting: 'Extracting Quantities',
  costing: 'Looking Up Costs',
  completed: 'Complete',
};

function getStepIndex(status: string): number {
  const idx = STEP_ORDER.indexOf(status as JobStatusType);
  return idx >= 0 ? idx : 0;
}

function StatusBadges({
  isActive,
  isComplete,
  isFailed,
  isCancelled,
}: {
  isActive: boolean;
  isComplete: boolean;
  isFailed: boolean;
  isCancelled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {isActive && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      )}
      {isComplete && (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Complete
        </Badge>
      )}
      {isFailed && (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      )}
      {isCancelled && (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelled
        </Badge>
      )}
    </div>
  );
}

function StepProgress({ currentStep, isActive }: { currentStep: number; isActive: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {STEP_ORDER.slice(0, -1).map((step, i) => {
        const isReached = i <= currentStep;
        const isCurrent = i === currentStep && isActive;
        return (
          <div key={step} className="flex-1 flex items-center gap-1">
            <div className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-1.5 w-full rounded-full transition-colors ${isReached ? 'bg-primary' : 'bg-muted'}`}
              />
              <span
                className={`text-[10px] leading-tight text-center ${isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'}`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TakeoffJobStatusCard({ estimateId, jobId, onComplete }: TakeoffJobStatusProps) {
  const { data: job, isLoading } = useTakeoffJobStatus(estimateId, jobId);
  const cancelJob = useCancelTakeoffJob();

  const status = (job?.status as JobStatusType) ?? 'pending';
  const isActive = ACTIVE_JOB_STATUSES.includes(status);
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';
  const isComplete = status === 'completed';
  const currentStep = getStepIndex(status);

  useEffect(() => {
    if (isComplete) onComplete();
  }, [isComplete, onComplete]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading job status...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">AI Takeoff</CardTitle>
        <StatusBadges
          isActive={isActive}
          isComplete={isComplete}
          isFailed={isFailed}
          isCancelled={isCancelled}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {!isFailed && !isCancelled && (
          <StepProgress currentStep={currentStep} isActive={isActive} />
        )}
        {isFailed && job?.error_message && (
          <p className="text-sm text-destructive">{job.error_message as string}</p>
        )}
        <div className="flex gap-2">
          {isActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancelJob.mutate({ estimateId, jobId })}
              disabled={cancelJob.isPending}
            >
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
