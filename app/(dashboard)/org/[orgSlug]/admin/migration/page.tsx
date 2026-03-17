'use client';

import { AlertCircle, Database, Plus } from 'lucide-react';
import { useState } from 'react';

import { MigrationBatchForm } from '@/components/Migration/MigrationBatchForm';
import { MigrationConflictForm } from '@/components/Migration/MigrationConflictForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useMigrationBatches, useMigrationConflicts } from '@/hooks/useMigration';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  queued: 'secondary',
  running: 'default',
  completed: 'default',
  failed: 'destructive',
  dead_letter: 'destructive',
};

function BatchConflicts({ batchId }: { batchId: string }) {
  const { data, isLoading } = useMigrationConflicts(batchId, { resolution_status: 'open' });
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const conflicts = data?.data ?? [];

  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (conflicts.length === 0)
    return <p className="text-sm text-muted-foreground">No open conflicts.</p>;

  return (
    <div className="space-y-2">
      {conflicts.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
        >
          <div>
            <span className="font-medium">{c.entity_type}</span>
            <span className="ml-2 text-muted-foreground">{c.conflict_type}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setResolvingId(c.id)}>
            Resolve
          </Button>
          <Dialog
            open={resolvingId === c.id}
            onOpenChange={(o) => {
              if (!o) setResolvingId(null);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Resolve Conflict</DialogTitle>
              </DialogHeader>
              <MigrationConflictForm
                batchId={batchId}
                conflictId={c.id}
                onSuccess={() => setResolvingId(null)}
                onCancel={() => setResolvingId(null)}
              />
            </DialogContent>
          </Dialog>
        </div>
      ))}
    </div>
  );
}

interface BatchRowProps {
  batch: { id: string; batch_name: string; source_system: string; status: string };
  expanded: boolean;
  onToggle: () => void;
}

function BatchRow({ batch, expanded, onToggle }: BatchRowProps) {
  return (
    <Card key={batch.id}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{batch.batch_name}</CardTitle>
            <p className="text-sm text-muted-foreground uppercase">
              {batch.source_system.replace('_', ' ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_COLORS[batch.status] ?? 'outline'} className="capitalize">
              {batch.status.replace('_', ' ')}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              <AlertCircle className="h-4 w-4" />
              Conflicts
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <BatchConflicts batchId={batch.id} />
        </CardContent>
      )}
    </Card>
  );
}

export default function MigrationPage() {
  const { data, isLoading } = useMigrationBatches();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const batches = data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Migration</h1>
          <p className="text-sm text-muted-foreground">
            Sage 50, Sage Construction, Almyta import batches.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Batch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Migration Batch</DialogTitle>
            </DialogHeader>
            <MigrationBatchForm onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {['sk-1', 'sk-2', 'sk-3'].map((id) => (
            <Skeleton key={id} className="h-24 w-full" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Database className="mb-4 h-12 w-12" />
          <p>No migration batches yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <BatchRow
              key={batch.id}
              batch={batch}
              expanded={expandedId === batch.id}
              onToggle={() => setExpandedId(expandedId === batch.id ? null : batch.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
