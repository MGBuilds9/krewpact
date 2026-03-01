'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Plus, FileText } from 'lucide-react';
import { useContractTerms } from '@/hooks/useContracting';
import { ContractTermsForm } from '@/components/Contracting/ContractTermsForm';
import type { ContractTerms } from '@/hooks/useContracting';

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

const CONTRACT_STATUSES = ['draft', 'pending_signature', 'signed', 'amended', 'terminated'] as const;

export default function ContractsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useContractTerms({
    contractStatus: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const contracts = (data?.data ?? []).filter((c: ContractTerms) => {
    if (!search) return true;
    return (
      c.legal_text_version.toLowerCase().includes(search.toLowerCase()) ||
      c.proposal_id.toLowerCase().includes(search.toLowerCase())
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <title>Contracts — KrewPact</title>
      <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contracts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {CONTRACT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {CONTRACT_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </Button>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No contracts yet</h3>
            <p className="text-muted-foreground mb-4">
              Create a contract from an accepted proposal
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {contracts.map((contract: ContractTerms) => (
            <Card
              key={contract.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/contracts/${contract.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">
                        {contract.legal_text_version}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-xs flex-shrink-0 border ${CONTRACT_STATUS_COLORS[contract.contract_status] ?? ''}`}
                      >
                        {CONTRACT_STATUS_LABELS[contract.contract_status] ?? contract.contract_status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Proposal: {contract.proposal_id}</span>
                      {contract.signed_at && (
                        <span>Signed: {new Date(contract.signed_at).toLocaleDateString('en-CA')}</span>
                      )}
                      <span>Created: {new Date(contract.created_at).toLocaleDateString('en-CA')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Contract</DialogTitle>
          </DialogHeader>
          <ContractTermsForm
            proposalId=""
            onSuccess={() => setDialogOpen(false)}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
