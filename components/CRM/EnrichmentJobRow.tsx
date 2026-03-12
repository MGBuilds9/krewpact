'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { useRetryEnrichment } from '@/hooks/useCRM';
import type { EnrichmentJob } from '@/hooks/useCRM';
import { RefreshCw } from 'lucide-react';
import { formatDateTime } from '@/lib/date';

const STATUS_BADGE: Record<
  string,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
> = {
  pending: { variant: 'outline', label: 'Pending' },
  in_progress: { variant: 'secondary', label: 'In Progress' },
  completed: { variant: 'default', label: 'Completed' },
  failed: { variant: 'destructive', label: 'Failed' },
};

interface EnrichmentJobRowProps {
  job: EnrichmentJob;
}

export function EnrichmentJobRow({ job }: EnrichmentJobRowProps) {
  const retryMutation = useRetryEnrichment();
  const badge = STATUS_BADGE[job.status] ?? { variant: 'outline' as const, label: job.status };

  return (
    <TableRow>
      <TableCell className="font-mono text-xs max-w-[120px] truncate" title={job.id}>
        {job.id.slice(0, 8)}...
      </TableCell>
      <TableCell className="font-mono text-xs max-w-[120px] truncate" title={job.lead_id}>
        {job.lead_id.slice(0, 8)}...
      </TableCell>
      <TableCell>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </TableCell>
      <TableCell className="capitalize">{job.source}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatDateTime(job.created_at, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </TableCell>
      <TableCell
        className="text-xs text-red-600 max-w-[200px] truncate"
        title={job.error_message ?? undefined}
      >
        {job.error_message ?? '-'}
      </TableCell>
      <TableCell>
        {job.status === 'failed' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => retryMutation.mutate(job.id)}
            disabled={retryMutation.isPending}
            className="gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
