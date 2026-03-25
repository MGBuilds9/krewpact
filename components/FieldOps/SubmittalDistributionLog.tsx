'use client';

import { CheckCircle2, Clock, Mail, Send } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDistributionLog } from '@/hooks/useDocumentControl';
import type { DistributionLog } from '@/lib/validators/document-control';

interface SubmittalDistributionLogProps {
  projectId: string;
  subId: string;
}

function StatusBadge({ status }: { status: DistributionLog['status'] }) {
  const config = {
    sent: { label: 'Sent', icon: Send, variant: 'secondary' as const },
    delivered: { label: 'Delivered', icon: Mail, variant: 'default' as const },
    acknowledged: { label: 'Acknowledged', icon: CheckCircle2, variant: 'default' as const },
  } as const;

  const { label, icon: Icon, variant } = config[status];

  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function LogRow({ entry }: { entry: DistributionLog }) {
  return (
    <li className="flex items-center gap-3 rounded-md border px-3 py-2">
      <Mail className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.recipient_name}</p>
        <p className="truncate text-xs text-muted-foreground">{entry.recipient_email}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge status={entry.status} />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {new Date(entry.sent_at).toLocaleDateString('en-CA')}
        </div>
        {entry.acknowledged_at && (
          <p className="text-xs text-muted-foreground">
            Ack: {new Date(entry.acknowledged_at).toLocaleDateString('en-CA')}
          </p>
        )}
      </div>
    </li>
  );
}

export function SubmittalDistributionLog({ projectId, subId }: SubmittalDistributionLogProps) {
  const { data, isLoading } = useDistributionLog(projectId, subId);
  const entries = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {['dl-1', 'dl-2', 'dl-3'].map((k) => (
          <Skeleton key={k} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Send className="h-10 w-10 mb-2 opacity-30" />
        <p className="text-sm">Not yet distributed</p>
        <p className="text-xs mt-1">Use the distribute button to send to recipients</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <LogRow key={entry.id} entry={entry} />
      ))}
    </ul>
  );
}
