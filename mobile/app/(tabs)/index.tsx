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
import { api, DashboardData, Project } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { KPICard } from '@/components/KPICard';
import { COLORS, SPACING } from '@/constants/config';
import { formatStatus } from '@/lib/format-status';

export default function DashboardScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: queryKeys.dashboard,
    queryFn: api.dashboard.get,
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
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
            <KPICard
              label="Active Projects"
              value={data.atAGlance.activeProjects}
              color={COLORS.primary}
            />
            <KPICard label="Open Leads" value={data.atAGlance.openLeads} color={COLORS.success} />
          </View>
          <View style={[styles.kpiGrid, { marginTop: SPACING.sm }]}>
            <KPICard
              label="Pending Expenses"
              value={data.atAGlance.pendingExpenses}
              color={COLORS.danger}
            />
            <KPICard
              label="Notifications"
              value={data.atAGlance.unreadNotifications}
              color={COLORS.warning}
            />
          </View>

          <Text style={styles.sectionTitle}>Recent Projects</Text>
          {data.recentProjects.map((project: Project) => (
            <View key={project.id} style={styles.projectRow}>
              <View style={styles.projectRowMain}>
                <Text style={styles.projectRowName} numberOfLines={1}>
                  {project.project_name}
                </Text>
                <Text style={styles.projectRowNumber}>{project.project_number}</Text>
              </View>
              <Text style={styles.projectRowStatus}>{formatStatus(project.status)}</Text>
            </View>
          ))}

          {data.recentProjects.length === 0 && (
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  center: { alignItems: 'center', paddingVertical: SPACING.xl },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: SPACING.md },
  errorText: { color: COLORS.danger, fontSize: 14 },
  empty: { color: COLORS.muted, textAlign: 'center', paddingVertical: SPACING.lg },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  projectRowMain: { flex: 1, marginRight: SPACING.sm },
  projectRowName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  projectRowNumber: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  projectRowStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
});
