import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProjectHealth } from '@/lib/api-client';
import { COLORS, SPACING } from '@/constants/config';

const HEALTH_COLORS: Record<string, string> = {
  healthy: COLORS.success,
  at_risk: COLORS.warning,
  critical: COLORS.danger,
};

const HEALTH_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  healthy: 'checkmark-circle',
  at_risk: 'warning',
  critical: 'close-circle',
};

interface ProjectHealthCardProps {
  project: ProjectHealth;
}

export function ProjectHealthCard({ project }: ProjectHealthCardProps) {
  const router = useRouter();
  const healthColor = HEALTH_COLORS[project.health] ?? COLORS.muted;
  const healthIcon = HEALTH_ICONS[project.health] ?? 'help-circle';
  const completionPct =
    project.milestone_total > 0
      ? Math.round((project.milestone_complete / project.milestone_total) * 100)
      : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/project/${project.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.projectNumber}>{project.project_number}</Text>
          <Text style={styles.projectName} numberOfLines={1}>{project.project_name}</Text>
        </View>
        <View style={styles.healthBadge}>
          <Ionicons name={healthIcon} size={18} color={healthColor} />
          <Text style={[styles.healthText, { color: healthColor }]}>
            {project.health.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{project.milestone_complete}/{project.milestone_total}</Text>
          <Text style={styles.statLabel}>Milestones</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, project.overdue_tasks > 0 && { color: COLORS.danger }]}>
            {project.overdue_tasks}
          </Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{completionPct}%</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${completionPct}%` as `${number}%`, backgroundColor: healthColor }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.background, borderRadius: 12, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  info: { flex: 1, marginRight: SPACING.sm },
  projectNumber: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  projectName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  healthBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  healthText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.sm },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.muted },
  progressTrack: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
});
