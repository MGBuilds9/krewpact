import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, DashboardData } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { KPICard } from '@/components/KPICard';
import { ProjectHealthCard } from '@/components/ProjectHealthCard';
import { COLORS, SPACING } from '@/constants/config';

export default function DashboardScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: queryKeys.dashboard,
    queryFn: api.dashboard.get,
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />
      }
    >
      <Text style={styles.header}>Dashboard</Text>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {isError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Failed to load dashboard. Pull to refresh.</Text>
        </View>
      )}

      {data && (
        <>
          <View style={styles.kpiGrid}>
            <KPICard label="Active Projects" value={data.activeProjects} color={COLORS.primary} />
            <KPICard label="Healthy" value={data.healthyProjects} color={COLORS.success} />
          </View>
          <View style={[styles.kpiGrid, { marginTop: SPACING.sm }]}>
            <KPICard label="Overdue Tasks" value={data.overdueTasks} color={COLORS.danger} />
            <KPICard label="Upcoming Milestones" value={data.upcomingMilestones} color={COLORS.warning} />
          </View>

          <Text style={styles.sectionTitle}>Project Health</Text>
          {data.projectHealth.map((project) => (
            <ProjectHealthCard key={project.id} project={project} />
          ))}

          {data.projectHealth.length === 0 && (
            <Text style={styles.empty}>No projects to display.</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  header: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  kpiGrid: { flexDirection: 'row', gap: SPACING.sm },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  center: { alignItems: 'center', paddingVertical: SPACING.xl },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: SPACING.md },
  errorText: { color: COLORS.danger, fontSize: 14 },
  empty: { color: COLORS.muted, textAlign: 'center', paddingVertical: SPACING.lg },
});
