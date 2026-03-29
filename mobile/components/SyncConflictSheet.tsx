import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/config';
import {
  getItemsByStatus,
  updateItem,
  deleteItem,
} from '@/lib/offline/store';
import { processQueue } from '@/lib/offline/sync-engine';
import type { OfflineQueueItem } from '@/lib/offline/types';

interface SyncConflictSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Modal sheet showing dead-lettered items that need manual resolution.
 * Users can retry, discard, or keep-both for each conflict.
 */
export function SyncConflictSheet({
  visible,
  onClose,
}: SyncConflictSheetProps) {
  const [items, setItems] = useState<OfflineQueueItem[]>([]);

  const refresh = useCallback(async () => {
    const deadLetters = await getItemsByStatus('dead_letter');
    setItems(deadLetters);
  }, []);

  useEffect(() => {
    if (visible) {
      void refresh();
    }
  }, [visible, refresh]);

  const handleRetry = useCallback(
    async (item: OfflineQueueItem) => {
      if (item.id === undefined) return;
      item.status = 'pending';
      item.retry_count = 0;
      item.last_error = undefined;
      await updateItem(item);
      await refresh();
      void processQueue();
    },
    [refresh],
  );

  const handleDiscard = useCallback(
    (item: OfflineQueueItem) => {
      Alert.alert(
        'Discard Change?',
        `This will permanently delete the queued ${item.entity_type} ${item.action}. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              if (item.id !== undefined) {
                await deleteItem(item.id);
                await refresh();
              }
            },
          },
        ],
      );
    },
    [refresh],
  );

  const renderItem = useCallback(
    ({ item }: { item: OfflineQueueItem }) => (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.entityBadge}>
            <Text style={styles.entityType}>
              {item.entity_type.replace(/_/g, ' ')}
            </Text>
          </View>
          <Text style={styles.action}>{item.action}</Text>
        </View>

        {item.last_error && (
          <Text style={styles.error} numberOfLines={3}>
            {item.last_error}
          </Text>
        )}

        <Text style={styles.meta}>
          Queued: {new Date(item.created_at).toLocaleString()}
          {'\n'}
          Attempts: {item.retry_count}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => handleRetry(item)}
          >
            <Ionicons name="refresh" size={16} color={COLORS.primary} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.discardButton}
            onPress={() => handleDiscard(item)}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            <Text style={styles.discardText}>Discard</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [handleRetry, handleDiscard],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.handleBar} />

        <View style={styles.header}>
          <Text style={styles.title}>Sync Conflicts</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>
          These items could not be synced automatically. Review each one
          and choose to retry or discard.
        </Text>

        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="checkmark-circle-outline"
                size={48}
                color={COLORS.success}
              />
              <Text style={styles.emptyText}>
                No conflicts to resolve.
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => (
            <View style={styles.separator} />
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  closeButton: { padding: SPACING.xs },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    padding: SPACING.md,
    paddingTop: SPACING.sm,
  },
  list: { padding: SPACING.md, paddingBottom: SPACING.xl },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  entityBadge: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  entityType: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  action: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  error: {
    fontSize: 13,
    color: COLORS.danger,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  meta: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 8,
  },
  retryText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  discardButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingVertical: 8,
  },
  discardText: { fontSize: 14, color: COLORS.danger, fontWeight: '600' },
  separator: { height: SPACING.sm },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.muted,
  },
});
