'use client';

import { ClipboardList, Paperclip, Plus, Send, Star } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { AttachmentList } from '@/components/FieldOps/AttachmentList';
import { AttachmentUpload } from '@/components/FieldOps/AttachmentUpload';
import { SubmittalCreateForm } from '@/components/FieldOps/SubmittalCreateForm';
import { SubmittalDistributionLog } from '@/components/FieldOps/SubmittalDistributionLog';
import { SubmittalReviewForm } from '@/components/FieldOps/SubmittalReviewForm';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
import type { Submittal } from '@/hooks/useFieldOps';
import { useSubmittals } from '@/hooks/useFieldOps';

function SubmittalAttachmentsDialog({ projectId, subId }: { projectId: string; subId: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useAttachments('submittal', projectId, subId);
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
          <DialogTitle>Submittal Attachments</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <AttachmentUpload entityType="submittal" projectId={projectId} entityId={subId} />
          <AttachmentList
            entityType="submittal"
            projectId={projectId}
            entityId={subId}
            attachments={attachments}
            isLoading={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SubmittalDistributionDialog({ projectId, subId }: { projectId: string; subId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Send className="h-4 w-4 mr-1" />
          Distribution
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Distribution Log</DialogTitle>
        </DialogHeader>
        <SubmittalDistributionLog projectId={projectId} subId={subId} />
      </DialogContent>
    </Dialog>
  );
}

function SubRow({
  sub,
  onReview,
  projectId,
}: {
  sub: Submittal;
  onReview: (id: string) => void;
  projectId: string;
}) {
  return (
    <TableRow>
      <TableCell className="font-mono font-medium">{sub.submittal_number}</TableCell>
      <TableCell className="font-medium">{sub.title}</TableCell>
      <TableCell>
        <StatusBadge status={sub.status} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {sub.due_at ? new Date(sub.due_at).toLocaleDateString('en-CA') : '—'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <SubmittalAttachmentsDialog projectId={projectId} subId={sub.id} />
          <SubmittalDistributionDialog projectId={projectId} subId={sub.id} />
          {sub.status === 'submitted' && (
            <Button variant="outline" size="sm" onClick={() => onReview(sub.id)}>
              <Star className="h-4 w-4 mr-1" />
              Review
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function SubmittalsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewSubId, setReviewSubId] = useState<string | null>(null);
  const { data, isLoading } = useSubmittals(projectId);
  const submittals = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Submittals</h1>
            <p className="text-sm text-muted-foreground">{data?.total ?? 0} submittals</p>
          </div>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Submittal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Submittal</DialogTitle>
            </DialogHeader>
            <SubmittalCreateForm
              projectId={projectId}
              onSuccess={() => setCreateOpen(false)}
              onCancel={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {['s1', 's2', 's3', 's4', 's5'].map((k) => (
            <Skeleton key={k} className="h-14 w-full" />
          ))}
        </div>
      ) : submittals.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-25" />
          <p className="text-lg font-medium">No submittals yet</p>
          <p className="text-sm">Track shop drawings, product data, and samples</p>
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
            {submittals.map((sub) => (
              <SubRow key={sub.id} sub={sub} onReview={setReviewSubId} projectId={projectId} />
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog
        open={!!reviewSubId}
        onOpenChange={(o) => {
          if (!o) setReviewSubId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Submittal</DialogTitle>
          </DialogHeader>
          {reviewSubId && (
            <SubmittalReviewForm
              projectId={projectId}
              subId={reviewSubId}
              onSuccess={() => setReviewSubId(null)}
              onCancel={() => setReviewSubId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
