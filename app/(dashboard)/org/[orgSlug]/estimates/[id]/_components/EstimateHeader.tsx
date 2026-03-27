'use client';

import { ArrowLeft, CheckCircle, FileText, Save, Send, Sparkles, XCircle } from 'lucide-react';

import { ExportPdfButton } from '@/components/Estimates/ExportPdfButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEstimate, useEstimateLines } from '@/hooks/useEstimates';
import type { EstimateStatus } from '@/lib/estimating/estimate-status';
import type { EstimatePdfData } from '@/lib/pdf/types';
import { cn } from '@/lib/utils';

type Estimate = NonNullable<ReturnType<typeof useEstimate>['data']>;
type Lines = NonNullable<ReturnType<typeof useEstimateLines>['data']>;

const STATUS_BADGE_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  review: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  superseded: 'bg-purple-100 text-purple-700 border-purple-200',
};
export const STATUS_TRANSITION_LABELS: Record<string, string> = {
  review: 'Submit for Review',
  sent: 'Mark as Sent',
  draft: 'Return to Draft',
  approved: 'Approve',
  rejected: 'Reject',
};
export const STATUS_TRANSITION_ICONS: Record<string, typeof Send> = {
  review: Send,
  sent: Send,
  draft: ArrowLeft,
  approved: CheckCircle,
  rejected: XCircle,
};

export function formatStatus(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface ActionButtonsProps {
  estimate: Estimate;
  lines: Lines;
  allowedTransitions: EstimateStatus[];
  isPending: boolean;
  isVersionPending: boolean;
  onTransition: (s: EstimateStatus) => void;
  onSaveVersion: () => void;
  onProposal: () => void;
  onTakeoff?: () => void;
}

function ActionButtons({
  estimate,
  lines,
  allowedTransitions,
  isPending,
  isVersionPending,
  onTransition,
  onSaveVersion,
  onProposal,
  onTakeoff,
}: ActionButtonsProps) {
  return (
    <div className="flex gap-2 flex-shrink-0">
      {allowedTransitions.map((status) => {
        const Icon = STATUS_TRANSITION_ICONS[status] || Send;
        return (
          <Button
            key={status}
            size="sm"
            variant={status === 'rejected' ? 'destructive' : 'default'}
            onClick={() => onTransition(status)}
            disabled={isPending}
          >
            <Icon className="h-4 w-4 mr-1" />
            {STATUS_TRANSITION_LABELS[status] || formatStatus(status)}
          </Button>
        );
      })}
      <Button size="sm" variant="outline" onClick={onSaveVersion} disabled={isVersionPending}>
        <Save className="h-4 w-4 mr-1" />
        Save Version
      </Button>
      <ExportPdfButton
        estimateNumber={estimate.estimate_number}
        estimateData={
          {
            companyName: 'MDM Group Inc.',
            estimateNumber: estimate.estimate_number,
            date: new Date().toISOString().split('T')[0],
            lineItems: lines.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unit: l.unit || undefined,
              unitCost: l.unit_cost,
              markup: l.markup_pct || undefined,
            })),
            subtotal: estimate.subtotal_amount,
            taxAmount: estimate.tax_amount,
            total: estimate.total_amount,
          } satisfies EstimatePdfData
        }
      />
      {onTakeoff && (
        <Button size="sm" variant="outline" onClick={onTakeoff}>
          <Sparkles className="h-4 w-4 mr-1" />
          AI Takeoff
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={onProposal}>
        <FileText className="h-4 w-4 mr-1" />
        Generate Proposal
      </Button>
    </div>
  );
}

export interface EstimateHeaderProps {
  estimate: Estimate;
  lines: Lines;
  allowedTransitions: EstimateStatus[];
  isPending: boolean;
  isVersionPending: boolean;
  onTransition: (s: EstimateStatus) => void;
  onSaveVersion: () => void;
  onProposal: () => void;
  onTakeoff?: () => void;
  onBack: () => void;
}

export function EstimateHeader({
  estimate,
  lines,
  allowedTransitions,
  isPending,
  isVersionPending,
  onTransition,
  onSaveVersion,
  onProposal,
  onTakeoff,
  onBack,
}: EstimateHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="mt-1"
        aria-label="Back to estimates"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{estimate.estimate_number}</h1>
          <Badge
            variant="outline"
            className={cn('border', STATUS_BADGE_COLORS[estimate.status] || '')}
          >
            {formatStatus(estimate.status)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Revision {estimate.revision_no} &middot; {estimate.currency_code}
        </p>
      </div>
      <ActionButtons
        estimate={estimate}
        lines={lines}
        allowedTransitions={allowedTransitions}
        isPending={isPending}
        isVersionPending={isVersionPending}
        onTransition={onTransition}
        onSaveVersion={onSaveVersion}
        onProposal={onProposal}
        onTakeoff={onTakeoff}
      />
    </div>
  );
}
