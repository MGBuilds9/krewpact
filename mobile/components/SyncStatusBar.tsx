import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/config';
import { countByStatus } from '@/lib/offline/store';
import { getOnlineState, subscribe } from '@/lib/offline/online-detector';
import {
  getIsSyncing,
  getLastSyncAt,
  onSyncComplete,
  processQueue,
} from '@/lib/offline/sync-engine';
import type { OfflineQueueStatus } from '@/lib/offline/types';

/**
 * Compact bar showing sync status: online/offline indicator,
 * pending count, and manual sync trigger.
 */
export function SyncStatusBar() {
  const [isOnline, setIsOnline] = useState(getOnlineState());
  const [isSyncing, setIsSyncing] = useState(getIsSyncing());
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [deadLetterCount, setDeadLetterCount] = useState(0);
  const [lastSync, setLastSync] = useState(getLastSyncAt());

  const refresh = useCallback(async () => {
    const counts = await countByStatus();
    setPendingCount(counts.pending);
    setFailedCount(counts.failed);
    setDeadLetterCount(counts.dead_letter);
    setIsSyncing(getIsSyncing());
    setLastSync(getLastSyncAt());
  }, []);

  useEffect(() => {
    const unsubOnline = subscribe((online) => {
      setIsOnline(online);
      void refresh();
    });

    const unsubSync = onSyncComplete(() => {
      void refresh();
    });

    void refresh();
    const interval = setInterval(() => void refresh(), 10000);

    return () => {
      unsubOnline();
      unsubSync();
      clearInterval(interval);
    };
  }, [refresh]);

  const handleSyncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      await processQueue();
    } finally {
      setIsSyncing(false);
      void refresh();
    }
  }, [refresh]);

  const totalPending = pendingCount + failedCount;
  const hasIssues = deadLetterCount > 0;

  // Don't show the bar if everything is synced and online
  if (isOnline && totalPending === 0 && !hasIssues) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        !isOnline && styles.offline,
        hasIssues && styles.hasIssues,
      ]}
    >
      <View style={styles.statusRow}>
        {/* Online/Offline indicator */}
        <View style={styles.indicator}>
          <View
            style={[
              styles.dot,
              { backgroundColor: isOnline ? COLORS.success : COLORS.danger },
            ]}
          />
          <Text style={styles.statusText}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        {/* Pending count */}
        {totalPending > 0 && (
          <View style={styles.pendingChip}>
            <Ionicons
              name="cloud-upload-outline"
              size={14}
              color={COLORS.warning}
            />
            <Text style={styles.pendingText}>
              {totalPending} pending
            </Text>
          </View>
        )}

        {/* Dead letter warning */}
        {hasIssues && (
          <View style={styles.errorChip}>
            <Ionicons
              name="alert-circle"
              size={14}
              color={COLORS.danger}
            />
            <Text style={styles.errorText}>
              {deadLetterCount} conflict{deadLetterCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Sync button */}
        {isOnline && totalPending > 0 && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSyncNow}
            disabled={isSyncing}
            activeOpacity={0.7}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="sync" size={16} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Last sync time */}
      {lastSync && (
        <Text style={styles.lastSync}>
          Last synced: {formatRelativeTime(lastSync)}
        </Text>
      )}
    </View>
  );
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return new Date(isoString).toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  offline: {
    borderColor: COLORS.danger + '40',
    backgroundColor: COLORS.danger + '08',
  },
  hasIssues: {
    borderColor: COLORS.warning + '40',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  pendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pendingText: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '500',
  },
  errorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },
  syncButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  lastSync: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
  },
});
