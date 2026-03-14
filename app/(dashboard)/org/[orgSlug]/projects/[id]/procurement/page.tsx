'use client';

import { use, useState } from 'react';
import { useRFQPackages, useCreateRFQPackage } from '@/hooks/useProcurement';
import { RFQPackageForm } from '@/components/Procurement/RFQPackageForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  issued: 'secondary',
  closed: 'outline',
  awarded: 'default',
  cancelled: 'destructive',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProjectProcurementPage({ params }: Props) {
  const { id: projectId } = use(params);
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useRFQPackages(projectId);
  const createRFQ = useCreateRFQPackage(projectId);

  function handleCreate(values: Record<string, unknown>) {
    createRFQ.mutate(values as Parameters<typeof createRFQ.mutate>[0], {
      onSuccess: () => setOpen(false),
    });
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading RFQs...</div>;
  if (error) return <div className="p-6 text-destructive">Failed to load procurement data.</div>;

  const rfqs = data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Procurement</h1>
          <p className="text-muted-foreground text-sm mt-1">
            RFQ packages and bid management for this project
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New RFQ</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create RFQ Package</DialogTitle>
            </DialogHeader>
            <RFQPackageForm onSubmit={handleCreate} isLoading={createRFQ.isPending} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>RFQ #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rfqs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No RFQ packages yet. Create one to start collecting bids.
                </TableCell>
              </TableRow>
            ) : (
              rfqs.map((rfq) => (
                <TableRow key={rfq.id}>
                  <TableCell className="font-mono text-sm">{rfq.rfq_number}</TableCell>
                  <TableCell>{rfq.title}</TableCell>
                  <TableCell>
                    {rfq.due_at ? new Date(rfq.due_at).toLocaleDateString('en-CA') : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[rfq.status] ?? 'outline'}>{rfq.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(rfq.created_at).toLocaleDateString('en-CA')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
