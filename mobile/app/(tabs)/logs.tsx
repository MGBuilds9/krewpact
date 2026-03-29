import React, { memo, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  api,
  DailyLog,
  DailyLogCreate,
  Project,
} from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { DailyLogForm } from '@/components/DailyLogForm';
import { COLORS, SPACING } from '@/constants/config';

const LogCard = memo(function LogCard({ log }: { log: DailyLog }) {
  const dateStr = new Date(log.log_date).toLocaleDateString();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.logDate}>{dateStr}</Text>
        {log.is_offline_origin && (
          <View style={styles.offlineBadge}>
            <Ionicons
              name="cloud-offline-outline"
              size={12}
              color={COLORS.warning}
            />
            <Text style={styles.offlineBadgeText}>Offline</Text>
          </View>
        )}
        {log.submitted_at && (
          <View style={styles.submittedBadge}>
            <Ionicons
              name="checkmark-circle"
              size={12}
              color={COLORS.success}
            />
            <Text style={styles.submittedText}>Submitted</Text>
          </View>
        )}
      </View>
      {log.work_summary && (
        <Text style={styles.summary} numberOfLines={3}>
          {log.work_summary}
        </Text>
      )}
      <View style={styles.cardFooter}>
        {log.crew_count !== null && (
          <View style={styles.metaChip}>
            <Ionicons
              name="people-outline"
              size={14}
              color={COLORS.muted}
            />
            <Text style={styles.metaText}>{log.crew_count} crew</Text>
          </View>
        )}
        {log.weather && typeof log.weather === 'object' && 'condition' in log.weather && (
          <View style={styles.metaChip}>
            <Ionicons
              name="cloud-outline"
              size={14}
              color={COLORS.muted}
            />
            <Text style={styles.metaText}>
              {String(log.weather.condition)}
            </Text>
          </View>
        )}
        {log.delays && (
          <View style={styles.metaChip}>
            <Ionicons
              name="alert-circle-outline"
              size={14}
              color={COLORS.warning}
            />
            <Text style={[styles.metaText, { color: COLORS.warning }]}>
              Delays
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

export default function LogsScreen() {
  const qc = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string | null>(
    null,
  );
  const [showForm, setShowForm] = useState(false);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<
    Project[]
  >({
    queryKey: queryKeys.projects,
    queryFn: api.projects.list,
  });

  const {
    data: logs = [],
    isLoading: logsLoading,
    isFetching,
    refetch,
  } = useQuery<DailyLog[]>({
    queryKey: queryKeys.projectDailyLogs(selectedProject ?? ''),
    queryFn: () => api.projects.dailyLogs.list(selectedProject!),
    enabled: Boolean(selectedProject),
  });

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active'),
    [projects],
  );

  // Auto-select first active project
  React.useEffect(() => {
    if (!selectedProject && activeProjects.length > 0) {
      setSelectedProject(activeProjects[0].id);
    }
  }, [activeProjects, selectedProject]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Daily Logs</Text>
        {selectedProject && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>New Log</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Project Selector */}
      {projectsLoading ? (
        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={{ marginBottom: SPACING.md }}
        />
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={activeProjects}
          keyExtractor={(p) => p.id}
          style={styles.projectPicker}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.projectChip,
                selectedProject === item.id &&
                  styles.projectChipSelected,
              ]}
              onPress={() => setSelectedProject(item.id)}
            >
              <Text
                style={[
                  styles.projectChipNumber,
                  selectedProject === item.id &&
                    styles.chipTextSelected,
                ]}
              >
                {item.project_number}
              </Text>
              <Text
                style={[
                  styles.projectChipName,
                  selectedProject === item.id &&
                    styles.chipTextSelected,
                ]}
                numberOfLines={1}
              >
                {item.project_name}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Logs List */}
      {!selectedProject ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="document-text-outline"
            size={48}
            color={COLORS.muted}
          />
          <Text style={styles.empty}>
            Select a project to view daily logs.
          </Text>
        </View>
      ) : logsLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !logsLoading}
              onRefresh={refetch}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No daily logs yet. Tap "New Log" to create one.
            </Text>
          }
          renderItem={({ item }) => <LogCard log={item} />}
          ItemSeparatorComponent={() => (
            <View style={styles.separator} />
          )}
        />
      )}

      {/* Daily Log Form Modal */}
      {selectedProject && (
        <Modal
          visible={showForm}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <DailyLogForm
            projectId={selectedProject}
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              refetch();
            }}
          />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    paddingBottom: 0,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  projectPicker: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxHeight: 64,
  },
  projectChip: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    minWidth: 120,
    maxWidth: 180,
  },
  projectChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  projectChipNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  projectChipName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 2,
  },
  chipTextSelected: { color: COLORS.primary },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  logDate: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.warning + '15',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  offlineBadgeText: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: '600',
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  submittedText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600',
  },
  summary: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: { fontSize: 12, color: COLORS.muted },
  separator: { height: SPACING.sm },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  empty: {
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
});
