import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { api, Project, TimeEntry, TimeEntryCreate } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { COLORS, SPACING } from '@/constants/config';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function ProjectPicker({
  projects,
  selected,
  onSelect,
}: {
  projects: Project[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectPicker}>
      {projects.map((p) => (
        <TouchableOpacity
          key={p.id}
          style={[styles.projectChip, selected === p.id && styles.projectChipSelected]}
          onPress={() => onSelect(p.id)}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.projectChipNumber, selected === p.id && styles.projectChipTextSelected]}
          >
            {p.project_number}
          </Text>
          <Text
            style={[styles.projectChipName, selected === p.id && styles.projectChipTextSelected]}
            numberOfLines={1}
          >
            {p.project_name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function TimeEntryRow({ entry }: { entry: TimeEntry }) {
  const total = entry.hours_regular + entry.hours_overtime;
  return (
    <View style={styles.entryRow}>
      <View style={styles.entryInfo}>
        <Text style={styles.entryDate}>{formatDate(entry.work_date)}</Text>
        {entry.notes && (
          <Text style={styles.entryNotes} numberOfLines={1}>
            {entry.notes}
          </Text>
        )}
      </View>
      <View style={styles.entryHours}>
        <Text style={styles.entryHoursValue}>{total}h</Text>
        {entry.hours_overtime > 0 && <Text style={styles.entryOT}>+{entry.hours_overtime} OT</Text>}
      </View>
    </View>
  );
}

export default function TimeScreen() {
  const qc = useQueryClient();
  const { userId } = useAuth();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [hoursRegular, setHoursRegular] = useState('');
  const [hoursOvertime, setHoursOvertime] = useState('');
  const [notes, setNotes] = useState('');

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: queryKeys.projects,
    queryFn: api.projects.list,
  });

  const {
    data: entries = [],
    isFetching: entriesFetching,
    refetch: refetchEntries,
  } = useQuery<TimeEntry[]>({
    queryKey: queryKeys.projectTimeEntries(selectedProject ?? ''),
    queryFn: () => api.projects.timeEntries.list(selectedProject!),
    enabled: Boolean(selectedProject),
  });

  const submitMutation = useMutation({
    mutationFn: (data: TimeEntryCreate) => api.projects.timeEntries.create(selectedProject!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projectTimeEntries(selectedProject!) });
      setHoursRegular('');
      setHoursOvertime('');
      setNotes('');
      Alert.alert('Success', 'Time entry saved.');
    },
    onError: () => Alert.alert('Error', 'Failed to save time entry. Please try again.'),
  });

  function handleSubmit() {
    if (!selectedProject || !userId) return;
    const regular = parseFloat(hoursRegular);
    if (isNaN(regular) || regular <= 0) {
      Alert.alert('Invalid', 'Enter regular hours (greater than 0).');
      return;
    }
    const overtime = hoursOvertime ? parseFloat(hoursOvertime) : 0;

    submitMutation.mutate({
      user_id: userId,
      work_date: new Date().toISOString().split('T')[0],
      hours_regular: regular,
      hours_overtime: overtime,
      notes: notes || undefined,
      source: 'mobile',
    });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter((e) => e.work_date === todayStr);
  const todayTotal = todayEntries.reduce((sum, e) => sum + e.hours_regular + e.hours_overtime, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={entriesFetching && !projectsLoading}
          onRefresh={refetchEntries}
        />
      }
    >
      <Text style={styles.header}>Time Tracking</Text>

      {/* Project selector */}
      <Text style={styles.label}>Select Project</Text>
      {projectsLoading ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : projects.length === 0 ? (
        <Text style={styles.empty}>No projects available.</Text>
      ) : (
        <ProjectPicker
          projects={projects}
          selected={selectedProject}
          onSelect={setSelectedProject}
        />
      )}

      {/* Hours entry form */}
      {selectedProject && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Log Hours — {todayStr}</Text>

          <View style={styles.hoursRow}>
            <View style={styles.hoursField}>
              <Text style={styles.fieldLabel}>Regular Hours *</Text>
              <TextInput
                style={styles.input}
                value={hoursRegular}
                onChangeText={setHoursRegular}
                placeholder="8"
                placeholderTextColor={COLORS.muted}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.hoursField}>
              <Text style={styles.fieldLabel}>Overtime</Text>
              <TextInput
                style={styles.input}
                value={hoursOvertime}
                onChangeText={setHoursOvertime}
                placeholder="0"
                placeholderTextColor={COLORS.muted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="What did you work on?"
              placeholderTextColor={COLORS.muted}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitMutation.isPending && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitMutation.isPending || !hoursRegular}
            activeOpacity={0.8}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Save Time Entry</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Today's summary */}
      {selectedProject && todayTotal > 0 && (
        <View style={styles.summaryCard}>
          <Ionicons name="time-outline" size={20} color={COLORS.primary} />
          <Text style={styles.summaryText}>Today: {todayTotal}h logged</Text>
        </View>
      )}

      {/* Recent entries */}
      {selectedProject && todayEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Entries</Text>
          {todayEntries.map((entry) => (
            <TimeEntryRow key={entry.id} entry={entry} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  header: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs },
  empty: { color: COLORS.muted, textAlign: 'center', paddingVertical: SPACING.lg },

  // Project picker
  projectPicker: { marginBottom: SPACING.md },
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
  projectChipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  projectChipNumber: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  projectChipName: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginTop: 2 },
  projectChipTextSelected: { color: COLORS.primary },

  // Form
  formCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  hoursRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  hoursField: { flex: 1 },
  field: { marginBottom: SPACING.sm },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  notesInput: { minHeight: 60 },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Summary
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  summaryText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },

  // Entries list
  section: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  entryInfo: { flex: 1 },
  entryDate: { fontSize: 14, color: COLORS.text },
  entryNotes: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  entryHours: { alignItems: 'flex-end' },
  entryHoursValue: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  entryOT: { fontSize: 11, color: COLORS.warning },
});
