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
import { ClipboardList, Plus, Star } from 'lucide-react';
import { useSubmittals } from '@/hooks/useFieldOps';
import { SubmittalCreateForm } from '@/components/FieldOps/SubmittalCreateForm';
import { SubmittalReviewForm } from '@/components/FieldOps/SubmittalReviewForm';
import type { Submittal } from '@/hooks/useFieldOps';

const STATUS_VARIANT: Record<
  Submittal['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'secondary',
  submitted: 'default',
  revise_and_resubmit: 'destructive',
  approved: 'default',
  approved_as_noted: 'default',
  rejected: 'destructive',
};

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
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
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
              <TableHead>Number</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submittals.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell className="font-mono font-medium">{sub.submittal_number}</TableCell>
                <TableCell className="font-medium">{sub.title}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[sub.status]}>
                    {sub.status.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {sub.due_at ? new Date(sub.due_at).toLocaleDateString('en-CA') : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {sub.status === 'submitted' && (
                    <Button variant="outline" size="sm" onClick={() => setReviewSubId(sub.id)}>
                      <Star className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!reviewSubId} onOpenChange={(o) => !o && setReviewSubId(null)}>
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
