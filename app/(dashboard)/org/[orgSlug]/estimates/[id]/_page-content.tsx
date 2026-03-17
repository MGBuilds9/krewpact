'use client';

import { ArrowLeft, CheckCircle, FileText, Plus, Save, Send, XCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { ExportPdfButton } from '@/components/Estimates/ExportPdfButton';
import { LineItemEditor } from '@/components/Estimates/LineItemEditor';
import { TotalsPanel } from '@/components/Estimates/TotalsPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAddEstimateLine,
  useCreateEstimateVersion,
  useDeleteEstimateLine,
  useEstimate,
  useEstimateLines,
  useEstimateVersions,
  useUpdateEstimate,
} from '@/hooks/useEstimates';
import { useEstimateAllowances, useEstimateAlternates } from '@/hooks/useEstimating';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import type { EstimateStatus } from '@/lib/estimating/estimate-status';
import { ALLOWED_STATUS_TRANSITIONS } from '@/lib/estimating/estimate-status';
import type { EstimatePdfData } from '@/lib/pdf/types';
import { cn } from '@/lib/utils';

const VersionHistory = dynamic(
  () => import('@/components/Estimates/VersionHistory').then((m) => m.VersionHistory),
  { loading: () => <Skeleton className="h-32 w-full rounded-xl" /> },
);
const AllowanceForm = dynamic(() =>
  import('@/components/Estimates/AllowanceForm').then((m) => m.AllowanceForm),
);
const AlternateForm = dynamic(() =>
  import('@/components/Estimates/AlternateForm').then((m) => m.AlternateForm),
);
const ProposalGenerationForm = dynamic(() =>
  import('@/components/Estimates/ProposalGenerationForm').then((m) => m.ProposalGenerationForm),
);

const STATUS_BADGE_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  review: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  superseded: 'bg-purple-100 text-purple-700 border-purple-200',
};
const STATUS_TRANSITION_LABELS: Record<string, string> = {
  review: 'Submit for Review',
  sent: 'Mark as Sent',
  draft: 'Return to Draft',
  approved: 'Approve',
  rejected: 'Reject',
};
const STATUS_TRANSITION_ICONS: Record<string, typeof Send> = {
  review: Send,
  sent: Send,
  draft: ArrowLeft,
  approved: CheckCircle,
  rejected: XCircle,
};

function formatStatus(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fmtCAD(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
}

type Estimate = NonNullable<ReturnType<typeof useEstimate>['data']>;
type Lines = NonNullable<ReturnType<typeof useEstimateLines>['data']>;
type Allowances = NonNullable<ReturnType<typeof useEstimateAllowances>['data']>;
type Alternates = NonNullable<ReturnType<typeof useEstimateAlternates>['data']>;

interface EstimateHeaderProps {
  estimate: Estimate;
  lines: Lines;
  allowedTransitions: EstimateStatus[];
  isPending: boolean;
  isVersionPending: boolean;
  onTransition: (s: EstimateStatus) => void;
  onSaveVersion: () => void;
  onProposal: () => void;
  onBack: () => void;
}
function EstimateHeader({
  estimate,
  lines,
  allowedTransitions,
  isPending,
  isVersionPending,
  onTransition,
  onSaveVersion,
  onProposal,
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
        <Button size="sm" variant="outline" onClick={onProposal}>
          <FileText className="h-4 w-4 mr-1" />
          Generate Proposal
        </Button>
      </div>
    </div>
  );
}

interface AllowancesSectionProps {
  allowances: Allowances;
  isEditable: boolean;
  onAdd: () => void;
}
function AllowancesSection({ allowances, isEditable, onAdd }: AllowancesSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Allowances</CardTitle>
        {isEditable && (
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Allowance
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {allowances.length === 0 ? (
          <p className="text-sm text-muted-foreground">No allowances added.</p>
        ) : (
          <div className="space-y-2">
            {allowances.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between text-sm border rounded-lg p-3"
              >
                <span className="font-medium">{a.allowance_name}</span>
                <span className="text-muted-foreground">{fmtCAD(a.allowance_amount)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AlternatesSectionProps {
  alternates: Alternates;
  isEditable: boolean;
  onAdd: () => void;
}
function AlternatesSection({ alternates, isEditable, onAdd }: AlternatesSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Alternates</CardTitle>
        {isEditable && (
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add Alternate
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {alternates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alternates added.</p>
        ) : (
          <div className="space-y-2">
            {alternates.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between text-sm border rounded-lg p-3"
              >
                <span className="font-medium">{a.title}</span>
                <div className="flex items-center gap-3">
                  <Badge variant={a.selected ? 'default' : 'outline'}>
                    {a.selected ? 'Selected' : 'Not selected'}
                  </Badge>
                  <span className="text-muted-foreground">{fmtCAD(a.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EstimateBuilderPage() {
  const params = useParams();
  const { push: orgPush } = useOrgRouter();
  const estimateId = params.id as string;
  const [allowanceDialogOpen, setAllowanceDialogOpen] = useState(false);
  const [alternateDialogOpen, setAlternateDialogOpen] = useState(false);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);

  const { data: estimate, isLoading } = useEstimate(estimateId);
  const { data: lines } = useEstimateLines(estimateId);
  const { data: versions } = useEstimateVersions(estimateId);
  const { data: allowancesData } = useEstimateAllowances(estimateId);
  const { data: alternatesData } = useEstimateAlternates(estimateId);
  const updateEstimate = useUpdateEstimate();
  const addLine = useAddEstimateLine();
  const deleteLine = useDeleteEstimateLine();
  const createVersion = useCreateEstimateVersion();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 animate-pulse" />
        <Skeleton className="h-24 w-full rounded-xl animate-pulse" />
        <Skeleton className="h-48 w-full rounded-xl animate-pulse" />
      </div>
    );
  }
  if (!estimate) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Estimate not found</h2>
        <p className="text-muted-foreground mb-4">
          This estimate may have been deleted or you don&apos;t have access.
        </p>
        <Button onClick={() => orgPush('/estimates')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Estimates
        </Button>
      </div>
    );
  }

  const currentStatus = estimate.status as EstimateStatus;
  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  const isEditable = currentStatus === 'draft' || currentStatus === 'review';
  const safeLines = lines || [];
  const allowances = allowancesData || [];
  const alternates = alternatesData || [];

  return (
    <div className="space-y-6">
      <EstimateHeader
        estimate={estimate}
        lines={safeLines}
        allowedTransitions={allowedTransitions}
        isPending={updateEstimate.isPending}
        isVersionPending={createVersion.isPending}
        onTransition={(s) => updateEstimate.mutate({ id: estimateId, status: s })}
        onSaveVersion={() => {
          const r = window.prompt('Version reason (optional):');
          createVersion.mutate({ estimateId, reason: r || undefined });
        }}
        onProposal={() => setProposalDialogOpen(true)}
        onBack={() => orgPush('/estimates')}
      />
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <LineItemEditor
            lines={safeLines}
            onAddLine={() =>
              addLine.mutate({
                estimateId,
                description: 'New line item',
                quantity: 1,
                unit_cost: 0,
                markup_pct: 0,
                sort_order: safeLines.length + 1,
              })
            }
            onUpdateLine={() => updateEstimate.mutate({ id: estimateId })}
            onDeleteLine={(lineId) => deleteLine.mutate({ estimateId, lineId })}
            isReadOnly={!isEditable}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <TotalsPanel
            subtotal={estimate.subtotal_amount}
            taxAmount={estimate.tax_amount}
            total={estimate.total_amount}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <VersionHistory versions={versions || []} />
        </CardContent>
      </Card>
      <AllowancesSection
        allowances={allowances}
        isEditable={isEditable}
        onAdd={() => setAllowanceDialogOpen(true)}
      />
      <AlternatesSection
        alternates={alternates}
        isEditable={isEditable}
        onAdd={() => setAlternateDialogOpen(true)}
      />
      <Dialog open={allowanceDialogOpen} onOpenChange={setAllowanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allowance</DialogTitle>
          </DialogHeader>
          <AllowanceForm
            estimateId={estimateId}
            onSuccess={() => setAllowanceDialogOpen(false)}
            onCancel={() => setAllowanceDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={alternateDialogOpen} onOpenChange={setAlternateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Alternate</DialogTitle>
          </DialogHeader>
          <AlternateForm
            estimateId={estimateId}
            onSuccess={() => setAlternateDialogOpen(false)}
            onCancel={() => setAlternateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Proposal</DialogTitle>
          </DialogHeader>
          <ProposalGenerationForm
            estimateId={estimateId}
            onSuccess={() => setProposalDialogOpen(false)}
            onCancel={() => setProposalDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
