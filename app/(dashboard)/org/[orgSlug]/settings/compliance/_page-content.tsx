'use client';

import { useState } from 'react';

import { ComplianceDocUploadForm } from '@/components/Procurement/ComplianceDocUploadForm';
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
import { useComplianceDocs, useCreateComplianceDoc } from '@/hooks/useProcurement';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  valid: 'default',
  expiring: 'secondary',
  expired: 'destructive',
  rejected: 'destructive',
};

type Doc = {
  id: string;
  compliance_type: string;
  doc_number: string | null;
  issued_on: string | null;
  expires_on: string | null;
  status: string;
  verified_at: string | null;
};

function DocRow({ doc }: { doc: Doc }) {
  const expired = doc.expires_on ? new Date(doc.expires_on) < new Date() : false;
  return (
    <TableRow key={doc.id}>
      <TableCell>{doc.compliance_type}</TableCell>
      <TableCell className="font-mono text-sm">{doc.doc_number || '—'}</TableCell>
      <TableCell>{doc.issued_on || '—'}</TableCell>
      <TableCell className={expired ? 'text-destructive font-medium' : undefined}>
        {doc.expires_on || '—'}
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[doc.status] || 'outline'}>{doc.status}</Badge>
      </TableCell>
      <TableCell>
        {doc.verified_at ? (
          new Date(doc.verified_at).toLocaleDateString('en-CA')
        ) : (
          <span className="text-muted-foreground text-sm">Pending</span>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function CompliancePage() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useComplianceDocs();
  const createDoc = useCreateComplianceDoc();

  function handleCreate(values: Record<string, unknown>) {
    createDoc.mutate(values as Parameters<typeof createDoc.mutate>[0], {
      onSuccess: () => setOpen(false),
    });
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading compliance docs...</div>;
  if (error)
    return <div className="p-6 text-destructive">Failed to load compliance documents.</div>;

  const docs = data ? data.data || [] : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trade Partner Compliance</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data ? data.total || 0 : 0} compliance documents — WSIB, COI, trade licenses, CCDC
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add Document</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add Compliance Document</DialogTitle>
            </DialogHeader>
            <ComplianceDocUploadForm onSubmit={handleCreate} isLoading={createDoc.isPending} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Doc Number</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No compliance documents on file.
                </TableCell>
              </TableRow>
            ) : (
              docs.map((doc) => <DocRow key={doc.id} doc={doc as Doc} />)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
