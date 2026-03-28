'use client';

import { HelpCircle, MessageSquare, Paperclip, Plus } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { AttachmentList } from '@/components/FieldOps/AttachmentList';
import { AttachmentUpload } from '@/components/FieldOps/AttachmentUpload';
import { RFICreateForm } from '@/components/FieldOps/RFICreateForm';
import { RFIResponseForm } from '@/components/FieldOps/RFIResponseForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAttachments } from '@/hooks/useDocumentControl';
import type { RFIItem } from '@/hooks/useFieldOps';
import { useRFIs } from '@/hooks/useFieldOps';

const STATUS_COLORS: Record<RFIItem['status'], string> = {
  open: 'bg-yellow-100 text-yellow-800',
  responded: 'bg-blue-100 text-blue-800',
  closed: 'bg-green-100 text-green-800',
  void: 'bg-gray-100 text-gray-600',
};

function RFIAttachmentsDialog({ projectId, rfiId }: { projectId: string; rfiId: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useAttachments('rfi', projectId, rfiId);
  const attachments = data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Paperclip className="h-4 w-4 mr-1" />
          {attachments.length > 0 ? attachments.length : ''}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>RFI Attachments</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <AttachmentUpload entityType="rfi" projectId={projectId} entityId={rfiId} />
          <AttachmentList
            entityType="rfi"
            projectId={projectId}
            entityId={rfiId}
            attachments={attachments}
            isLoading={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RFIRow({
  rfi,
  onRespond,
  projectId,
}: {
  rfi: RFIItem;
  onRespond: (id: string) => void;
  projectId: string;
}) {
  return (
    <TableRow>
      <TableCell className="font-mono font-medium">{rfi.rfi_number}</TableCell>
      <TableCell>
        <p className="font-medium">{rfi.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{rfi.question_text}</p>
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
        <div className="flex items-center justify-end gap-1">
          <RFIAttachmentsDialog projectId={projectId} rfiId={rfi.id} />
          {rfi.status === 'open' && (
            <Button variant="outline" size="sm" onClick={() => onRespond(rfi.id)}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Respond
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// eslint-disable-next-line max-lines-per-function
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
          {['r1', 'r2', 'r3', 'r4', 'r5'].map((k) => (
            <Skeleton key={k} className="h-14 w-full" />
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
              {['Number', 'Title', 'Status', 'Due'].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rfis.map((rfi) => (
              <RFIRow key={rfi.id} rfi={rfi} onRespond={setRespondRfiId} projectId={projectId} />
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog
        open={!!respondRfiId}
        onOpenChange={(o) => {
          if (!o) setRespondRfiId(null);
        }}
      >
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
