'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { HelpCircle, Plus, MessageSquare } from 'lucide-react';
import { useRFIs } from '@/hooks/useFieldOps';
import { RFICreateForm } from '@/components/FieldOps/RFICreateForm';
import { RFIResponseForm } from '@/components/FieldOps/RFIResponseForm';
import type { RFIItem } from '@/hooks/useFieldOps';

const STATUS_COLORS: Record<RFIItem['status'], string> = {
  open: 'bg-yellow-100 text-yellow-800',
  responded: 'bg-blue-100 text-blue-800',
  closed: 'bg-green-100 text-green-800',
  void: 'bg-gray-100 text-gray-600',
};

export default function RFIsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [createOpen, setCreateOpen] = useState(false);
  const [respondRfiId, setRespondRfiId] = useState<string | null>(null);

  const { data, isLoading } = useRFIs(projectId);
  const rfis = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">RFIs</h1>
            <p className="text-sm text-muted-foreground">
              {data?.total ?? 0} requests for information
            </p>
          </div>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New RFI
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create RFI</DialogTitle>
            </DialogHeader>
            <RFICreateForm
              projectId={projectId}
              onSuccess={() => setCreateOpen(false)}
              onCancel={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : rfis.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <HelpCircle className="h-16 w-16 mx-auto mb-4 opacity-25" />
          <p className="text-lg font-medium">No RFIs yet</p>
          <p className="text-sm">Submit a request for information to get clarity</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rfis.map((rfi) => (
              <TableRow key={rfi.id}>
                <TableCell className="font-mono font-medium">{rfi.rfi_number}</TableCell>
                <TableCell>
                  <p className="font-medium">{rfi.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {rfi.question_text}
                  </p>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rfi.status]}`}
                  >
                    {rfi.status}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {rfi.due_at ? new Date(rfi.due_at).toLocaleDateString('en-CA') : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {rfi.status === 'open' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRespondRfiId(rfi.id)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Respond
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!respondRfiId} onOpenChange={(o) => !o && setRespondRfiId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Response</DialogTitle>
          </DialogHeader>
          {respondRfiId && (
            <RFIResponseForm
              projectId={projectId}
              rfiId={respondRfiId}
              onSuccess={() => setRespondRfiId(null)}
              onCancel={() => setRespondRfiId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
