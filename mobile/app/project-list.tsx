import React, { memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Project } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { COLORS, SPACING } from '@/constants/config';
import { formatStatus } from '@/lib/format-status';

const STATUS_COLORS: Record<string, string> = {
  active: COLORS.success,
  on_hold: COLORS.warning,
  completed: COLORS.muted,
  cancelled: COLORS.danger,
};

const ProjectCard = memo(function ProjectCard({
  project,
  onPress,
}: {
  project: Project;
  onPress: () => void;
}) {
  const statusColor = STATUS_COLORS[project.status] ?? COLORS.muted;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.projectNumber}>{project.project_number}</Text>
        <View
          style={[styles.badge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}
        >
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {formatStatus(project.status)}
          </Text>
        </View>
      </View>
      <Text style={styles.projectName} numberOfLines={2}>
        {project.project_name}
      </Text>
      {project.start_date && (
        <Text style={styles.date}>Started {new Date(project.start_date).toLocaleDateString()}</Text>
      )}
    </TouchableOpacity>
  );
});

export default function ProjectListScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isFetching } = useQuery<Project[]>({
    queryKey: queryKeys.projects,
    queryFn: api.projects.list,
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.header}>All Projects</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : isError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Failed to load projects. Pull to refresh.</Text>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>No projects found.</Text>}
          renderItem={({ item }) => (
            <ProjectCard project={item} onPress={() => router.push(`/project/${item.id}`)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  backBtn: { padding: SPACING.xs },
  header: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  listContent: { padding: SPACING.md, paddingTop: 0, paddingBottom: SPACING.xl },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  projectNumber: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  badge: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  projectName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  date: { fontSize: 13, color: COLORS.muted, marginTop: SPACING.xs },
  separator: { height: SPACING.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: SPACING.md, margin: SPACING.md },
  errorText: { color: COLORS.danger },
  empty: { color: COLORS.muted, textAlign: 'center', paddingVertical: SPACING.lg },
});
