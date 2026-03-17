'use client';

import { Mail, Paperclip } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmailMessages } from '@/hooks/useEmail';
import { cn } from '@/lib/utils';

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

function InboxPreviewSkeleton(): React.ReactElement {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <Skeleton className="h-4 w-4 mt-0.5 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-full" />
          </div>
          <Skeleton className="h-3 w-12 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

type GraphMessage = NonNullable<ReturnType<typeof useEmailMessages>['data']>['value'][number];

function MessageItem({ message }: { message: GraphMessage }): React.ReactElement {
  const senderName =
    message.from?.emailAddress.name || message.from?.emailAddress.address || 'Unknown';
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors',
        !message.isRead && 'bg-muted/30',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={cn('text-sm truncate', !message.isRead ? 'font-semibold' : 'font-medium')}>
            {senderName}
          </p>
          {!message.isRead && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
              New
            </Badge>
          )}
          {message.hasAttachments && (
            <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        <p
          className={cn(
            'text-sm truncate',
            !message.isRead ? 'font-medium text-foreground' : 'text-muted-foreground',
          )}
        >
          {message.subject || '(no subject)'}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{message.bodyPreview}</p>
      </div>
      <span className="text-[11px] text-muted-foreground flex-shrink-0 pt-0.5">
        {formatTimeAgo(message.receivedDateTime)}
      </span>
    </div>
  );
}

export default function InboxPreview(): React.ReactElement {
  const { data, isLoading, error } = useEmailMessages({ top: 5 });
  const messages = data?.value ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5" />
          Inbox
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <InboxPreviewSkeleton />}
        {error && (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Microsoft 365 not connected</p>
            <p className="text-xs mt-1">Connect your M365 account to see your inbox</p>
          </div>
        )}
        {!isLoading && !error && messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No recent emails</p>
          </div>
        )}
        {!isLoading && !error && messages.length > 0 && (
          <div className="space-y-1">
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
