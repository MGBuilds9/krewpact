'use client';

import { ArrowLeft, FilePen, FileSignature } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { ContractAmendmentForm } from '@/components/Contracting/ContractAmendmentForm';
import { ESignEnvelopeForm } from '@/components/Contracting/ESignEnvelopeForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { ESignEnvelope } from '@/hooks/useContracting';
import { useContractTerm, useESignEnvelopes } from '@/hooks/useContracting';

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  pending_signature: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  signed: 'bg-green-100 text-green-700 border-green-200',
  amended: 'bg-blue-100 text-blue-700 border-blue-200',
  terminated: 'bg-red-100 text-red-700 border-red-200',
};
const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_signature: 'Pending Signature',
  signed: 'Signed',
  amended: 'Amended',
  terminated: 'Terminated',
};
const ENVELOPE_STATUS_COLORS: Record<string, string> = {
  created: 'bg-gray-100 text-gray-700 border-gray-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  voided: 'bg-red-100 text-red-700 border-red-200',
  declined: 'bg-orange-100 text-orange-700 border-orange-200',
};

type Contract = NonNullable<ReturnType<typeof useContractTerm>['data']>;

interface ContractInfoProps {
  contract: Contract;
}
function ContractInfo({ contract }: ContractInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contract Details</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground mb-1">Proposal ID</p>
          <p className="font-mono text-xs">{contract.proposal_id}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Legal Text Version</p>
          <p>{contract.legal_text_version}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Created</p>
          <p>{new Date(contract.created_at).toLocaleDateString('en-CA')}</p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Last Updated</p>
          <p>{new Date(contract.updated_at).toLocaleDateString('en-CA')}</p>
        </div>
        {contract.signed_at && (
          <div>
            <p className="text-muted-foreground mb-1">Signed At</p>
            <p>{new Date(contract.signed_at).toLocaleDateString('en-CA')}</p>
          </div>
        )}
        {contract.supersedes_contract_id && (
          <div>
            <p className="text-muted-foreground mb-1">Supersedes Contract</p>
            <p className="font-mono text-xs">{contract.supersedes_contract_id}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface EnvelopesCardProps {
  envelopes: ESignEnvelope[];
  isLoading: boolean;
}
function EnvelopesCard({ envelopes, isLoading }: EnvelopesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">E-Sign Envelopes</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {['e1', 'e2'].map((i) => (
              <Skeleton key={i} className="h-14 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : envelopes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No e-sign envelopes yet. Click &quot;Create E-Sign Envelope&quot; to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {envelopes.map((envelope) => (
              <div
                key={envelope.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <FileSignature className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium capitalize">{envelope.provider}</p>
                    <p className="text-xs text-muted-foreground">
                      {envelope.signer_count} signer{envelope.signer_count !== 1 ? 's' : ''}
                      {envelope.provider_envelope_id && (
                        <> &middot; {envelope.provider_envelope_id}</>
                      )}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs border ${ENVELOPE_STATUS_COLORS[envelope.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                >
                  {envelope.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [eSignDialogOpen, setESignDialogOpen] = useState(false);
  const [amendDialogOpen, setAmendDialogOpen] = useState(false);
  const { data: contract, isLoading: contractLoading } = useContractTerm(id);
  const { data: envelopesData, isLoading: envelopesLoading } = useESignEnvelopes(id);
  const envelopes = envelopesData?.data ?? [];

  if (contractLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 animate-pulse" />
        <Skeleton className="h-40 rounded-xl animate-pulse" />
        <Skeleton className="h-32 rounded-xl animate-pulse" />
      </div>
    );
  if (!contract)
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Contract not found.</p>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">{contract.legal_text_version}</h1>
          <Badge
            variant="outline"
            className={`border ${CONTRACT_STATUS_COLORS[contract.contract_status] || ''}`}
          >
            {CONTRACT_STATUS_LABELS[contract.contract_status] || contract.contract_status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAmendDialogOpen(true)}>
            <FilePen className="h-4 w-4 mr-2" />
            Amend Contract
          </Button>
          <Button onClick={() => setESignDialogOpen(true)}>
            <FileSignature className="h-4 w-4 mr-2" />
            Create E-Sign Envelope
          </Button>
        </div>
      </div>
      <ContractInfo contract={contract} />
      <EnvelopesCard envelopes={envelopes} isLoading={envelopesLoading} />
      <Dialog open={eSignDialogOpen} onOpenChange={setESignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create E-Sign Envelope</DialogTitle>
          </DialogHeader>
          <ESignEnvelopeForm
            contractId={id}
            onSuccess={() => setESignDialogOpen(false)}
            onCancel={() => setESignDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={amendDialogOpen} onOpenChange={setAmendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Amend Contract</DialogTitle>
          </DialogHeader>
          <ContractAmendmentForm
            contractId={id}
            onSuccess={() => setAmendDialogOpen(false)}
            onCancel={() => setAmendDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
