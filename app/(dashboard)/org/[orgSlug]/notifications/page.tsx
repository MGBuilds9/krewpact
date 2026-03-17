'use client';

import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

type Notification = {
  id: string;
  state: string;
  title: string;
  message?: string | null;
  created_at: string;
  channel: string;
};

function NotificationCard({
  notification,
  onMark,
  onDelete,
}: {
  notification: Notification;
  onMark: (n: Notification) => void;
  onDelete: (id: string) => void;
}) {
  const unread = notification.state !== 'read';
  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-sm transition-shadow',
        unread && 'border-l-4 border-l-primary bg-primary/5',
      )}
      onClick={() => onMark(notification)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn('text-sm truncate', unread ? 'font-semibold' : 'font-medium')}>
                {notification.title}
              </h3>
              {unread && <Badge className="h-2 w-2 p-0 rounded-full flex-shrink-0" />}
            </div>
            {notification.message && (
              <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>{new Date(notification.created_at).toLocaleString()}</span>
              <Badge variant="outline" className="text-xs capitalize">
                {notification.channel}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
              aria-label="Delete notification"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const allNotifications = notifications || [];
  const unreadCount = allNotifications.filter((n) => n.state !== 'read').length;

  async function handleMarkAllRead() {
    try {
      await markAllRead.mutateAsync();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark notifications as read');
    }
  }

  async function handleMark(notification: Notification) {
    if (notification.state !== 'read') await markRead.mutateAsync(notification.id);
  }

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>
      {allNotifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No notifications</h3>
            <p className="text-muted-foreground">You&apos;re all caught up</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {allNotifications.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n as Notification}
              onMark={handleMark}
              onDelete={(id) => deleteNotification.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
