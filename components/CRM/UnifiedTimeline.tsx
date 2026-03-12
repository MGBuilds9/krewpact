'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Phone,
  Mail,
  Calendar,
  StickyNote,
  ListTodo,
  Send,
  MessageCircle,
  Bot,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { useTimeline } from '@/hooks/useCRM';
import type { TimelineEntry } from '@/app/api/crm/activities/timeline/route';
import { formatDateTime } from '@/lib/date';

const sourceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: StickyNote,
  task: ListTodo,
  linkedin: MessageCircle,
  sms: Send,
};

const sourceColors: Record<string, string> = {
  call: 'bg-blue-100 text-blue-700 border-blue-200',
  email: 'bg-purple-100 text-purple-700 border-purple-200',
  meeting: 'bg-green-100 text-green-700 border-green-200',
  note: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  task: 'bg-orange-100 text-orange-700 border-orange-200',
  linkedin: 'bg-sky-100 text-sky-700 border-sky-200',
  sms: 'bg-teal-100 text-teal-700 border-teal-200',
};

interface TimelineItemProps {
  entry: TimelineEntry;
}

function TimelineItem({ entry }: TimelineItemProps) {
  const Icon = sourceIcons[entry.type] || StickyNote;
  const colorClass = sourceColors[entry.type] || 'bg-gray-100 text-gray-700 border-gray-200';
  const isAutomated = entry.metadata?.is_automated === true;
  const direction = entry.metadata?.direction as string | undefined;
  const outcome = entry.metadata?.outcome as string | undefined;

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 mt-1">
        <div
          className={cn('w-8 h-8 rounded-full flex items-center justify-center border', colorClass)}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-medium text-sm">{entry.title}</span>
          <Badge variant="outline" className="text-xs">
            {entry.source === 'outreach' ? 'outreach' : entry.type}
          </Badge>
          {isAutomated && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Bot className="h-3 w-3" />
              Auto
            </Badge>
          )}
          {direction && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              {direction === 'inbound' ? (
                <ArrowDownLeft className="h-3 w-3" />
              ) : (
                <ArrowUpRight className="h-3 w-3" />
              )}
              {direction}
            </span>
          )}
          {outcome && (
            <Badge variant="outline" className="text-xs">
              {outcome.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
        {entry.details && (
          <p className="text-sm text-muted-foreground mb-1 line-clamp-2">{entry.details}</p>
        )}
        <time className="text-xs text-muted-foreground">
          {formatDateTime(entry.occurred_at, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </div>
    </div>
  );
}

interface UnifiedTimelineProps {
  leadId?: string;
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  limit?: number;
}

export function UnifiedTimeline({
  leadId,
  accountId,
  contactId,
  opportunityId,
  limit = 50,
}: UnifiedTimelineProps) {
  const { data, isLoading } = useTimeline({
    leadId,
    accountId,
    contactId,
    opportunityId,
    limit,
  });

  const entries = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <StickyNote className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <TimelineItem key={`${entry.source}-${entry.id}`} entry={entry} />
      ))}
    </div>
  );
}
