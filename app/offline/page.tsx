'use client';

import { CloudOff, RefreshCw, WifiOff } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import type { SyncStatus } from '@/lib/offline/types';

function SyncQueueCard({ syncStatus }: { syncStatus: SyncStatus }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sync Queue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {syncStatus.pending_count > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pending</span>
            <Badge variant="secondary">{syncStatus.pending_count}</Badge>
          </div>
        )}
        {syncStatus.syncing_count > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Syncing</span>
            <Badge variant="default">{syncStatus.syncing_count}</Badge>
          </div>
        )}
        {syncStatus.failed_count > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Failed (will retry)</span>
            <Badge variant="outline">{syncStatus.failed_count}</Badge>
          </div>
        )}
        {syncStatus.dead_letter_count > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-destructive">Needs Review</span>
            <Badge variant="destructive">{syncStatus.dead_letter_count}</Badge>
          </div>
        )}
        {syncStatus.last_sync_at && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Last synced: {new Date(syncStatus.last_sync_at).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function OfflinePage() {
  const { isOnline, checkNow } = useOnlineStatus();
  const syncStatus = useSyncStatus();

  const totalQueued =
    syncStatus.pending_count +
    syncStatus.failed_count +
    syncStatus.syncing_count;

  const showQueue = totalQueued > 0 || syncStatus.dead_letter_count > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            {isOnline ? (
              <CloudOff className="h-8 w-8 text-muted-foreground" />
            ) : (
              <WifiOff className="h-8 w-8 text-destructive" />
            )}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isOnline ? 'Connection Restored' : "You're Offline"}
            </h1>
            <p className="text-muted-foreground">
              {isOnline
                ? 'Your queued changes will sync automatically.'
                : 'Your changes are saved locally and will sync when you reconnect.'}
            </p>
          </div>
        </div>
        {showQueue ? <SyncQueueCard syncStatus={syncStatus} /> : null}
        <div className="flex flex-col gap-3">
          <Button
            onClick={async () => {
              const online = await checkNow();
              if (online) window.location.href = '/';
            }}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Check Connection
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  );
}
