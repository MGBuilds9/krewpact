'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, ShieldAlert } from 'lucide-react';
import { usePrivacyRequests, useUpdatePrivacyRequest } from '@/hooks/useGovernance';
import { PrivacyRequestForm } from '@/components/Privacy/PrivacyRequestForm';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  received: 'secondary',
  verified: 'secondary',
  in_progress: 'default',
  completed: 'default',
  rejected: 'destructive',
};

const TYPE_LABELS: Record<string, string> = {
  access: 'Access Request',
  correction: 'Correction',
  deletion: 'Deletion',
  export: 'Data Export',
};

export default function PrivacyPage() {
  const { data, isLoading } = usePrivacyRequests();
  const update = useUpdatePrivacyRequest();
  const [open, setOpen] = useState(false);

  const requests = data?.data ?? [];

  async function advanceStatus(id: string, current: string) {
    const flow: Record<string, string> = {
      received: 'verified',
      verified: 'in_progress',
      in_progress: 'completed',
    };
    const next = flow[current];
    if (next)
      await update.mutateAsync({
        id,
        status: next as 'received' | 'verified' | 'in_progress' | 'completed' | 'rejected',
      });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Privacy Requests</h1>
          <p className="text-sm text-muted-foreground">
            PIPEDA compliance — access, correction, deletion, export requests.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Log Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Privacy Request</DialogTitle>
            </DialogHeader>
            <PrivacyRequestForm onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <ShieldAlert className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No privacy requests logged.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex-1">
                  <p className="font-medium">{req.requester_name ?? req.requester_email}</p>
                  <p className="text-sm text-muted-foreground">{req.requester_email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {TYPE_LABELS[req.request_type]} ·{' '}
                    {new Date(req.created_at).toLocaleDateString('en-CA')}
                  </p>
                </div>
                <Badge variant={STATUS_COLORS[req.status] ?? 'outline'} className="capitalize">
                  {req.status.replace('_', ' ')}
                </Badge>
                {['received', 'verified', 'in_progress'].includes(req.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => advanceStatus(req.id, req.status)}
                  >
                    Advance
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
