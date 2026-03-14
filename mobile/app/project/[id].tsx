import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Project, Task } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { DailyLogForm } from '@/components/DailyLogForm';
import { COLORS, SPACING } from '@/constants/config';

const STATUS_COLORS: Record<string, string> = {
  active: COLORS.success,
  on_hold: COLORS.warning,
  completed: COLORS.muted,
  cancelled: COLORS.danger,
};

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: COLORS.muted,
  in_progress: COLORS.primary,
  done: COLORS.success,
  blocked: COLORS.danger,
};

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function TaskRow({ task }: { task: Task }) {
  const statusColor = TASK_STATUS_COLORS[task.status] ?? COLORS.muted;
  const overdue = isOverdue(task.due_date) && task.status !== 'done';

  return (
    <View style={[styles.taskRow, overdue && styles.taskRowOverdue]}>
      <View style={[styles.taskStatusDot, { backgroundColor: statusColor }]} />
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, overdue && styles.taskTitleOverdue]} numberOfLines={2}>
          {task.title}
        </Text>
        {task.due_date && (
          <Text style={[styles.taskDue, overdue && styles.taskDueOverdue]}>
            {overdue ? 'Overdue: ' : 'Due: '}
            {new Date(task.due_date).toLocaleDateString()}
          </Text>
        )}
      </View>
      <View style={[styles.taskBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
        <Text style={[styles.taskBadgeText, { color: statusColor }]}>
          {task.status.replace('_', ' ')}
        </Text>
      </View>
    </View>
  );
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showLogModal, setShowLogModal] = useState(false);

  const { data: project, isLoading: projectLoading, refetch: refetchProject } = useQuery<Project>({
    queryKey: queryKeys.project(id),
    queryFn: () => api.projects.get(id),
    enabled: Boolean(id),
  });

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: queryKeys.projectTasks(id),
    queryFn: () => api.projects.tasks.list(id),
    enabled: Boolean(id),
  });

  const isLoading = projectLoading || tasksLoading;

  function handleRefresh() {
    refetchProject();
    refetchTasks();
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.errorText}>Project not found.</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[project.status] ?? COLORS.muted;
  const overdueTasks = tasks.filter((t) => isOverdue(t.due_date) && t.status !== 'done');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.projectNumber}>{project.project_number}</Text>
        </View>

        {/* Project Info */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.projectName} numberOfLines={2}>{project.project_name}</Text>
            <View style={[styles.badge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>
                {project.status.replace('_', ' ')}
              </Text>
            </View>
          </View>
          <View style={styles.dateRow}>
            {project.start_date && (
              <View style={styles.datePill}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.muted} />
                <Text style={styles.dateText}>
                  Start: {new Date(project.start_date).toLocaleDateString()}
                </Text>
              </View>
            )}
            {project.end_date && (
              <View style={styles.datePill}>
                <Ionicons name="flag-outline" size={14} color={COLORS.muted} />
                <Text style={styles.dateText}>
                  End: {new Date(project.end_date).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Task Stats */}
        {tasks.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{tasks.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>{doneTasks.length}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={[styles.statValue, { color: COLORS.danger }]}>{overdueTasks.length}</Text>
              <Text style={styles.statLabel}>Overdue</Text>
            </View>
          </View>
        )}

        {/* Tasks */}
        <Text style={styles.sectionTitle}>Tasks</Text>
        {tasks.length === 0 ? (
          <Text style={styles.empty}>No tasks for this project.</Text>
        ) : (
          <View style={styles.taskList}>
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowLogModal(true)} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Daily Log Modal */}
      <Modal visible={showLogModal} animationType="slide" presentationStyle="pageSheet">
        <DailyLogForm
          projectId={id}
          onClose={() => setShowLogModal(false)}
          onSuccess={() => setShowLogModal(false)}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: SPACING.md, paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  backButton: { padding: SPACING.xs },
  projectNumber: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  card: { backgroundColor: COLORS.background, borderRadius: 12, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.sm },
  projectName: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.text },
  badge: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, flexShrink: 0 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 13, color: COLORS.muted },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statChip: { flex: 1, backgroundColor: COLORS.background, borderRadius: 10, padding: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.muted },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  taskList: { gap: SPACING.xs },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.background, borderRadius: 10, padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  taskRowOverdue: { borderColor: COLORS.danger + '60', backgroundColor: '#FFF5F5' },
  taskStatusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  taskTitleOverdue: { color: COLORS.danger },
  taskDue: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  taskDueOverdue: { color: COLORS.danger },
  taskBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0 },
  taskBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  errorText: { color: COLORS.danger, textAlign: 'center', padding: SPACING.lg },
  empty: { color: COLORS.muted, textAlign: 'center', paddingVertical: SPACING.lg },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 },
});
