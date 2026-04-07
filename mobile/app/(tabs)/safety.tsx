import React, { memo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api, Project } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { COLORS, SPACING } from '@/constants/config';

type FormType = 'toolbox_talk' | 'inspection' | 'incident';

const FORM_TYPES: { key: FormType; label: string; icon: string }[] = [
  { key: 'toolbox_talk', label: 'Toolbox Talk', icon: 'chatbubbles-outline' },
  { key: 'inspection', label: 'Site Inspection', icon: 'search-outline' },
  { key: 'incident', label: 'Incident Report', icon: 'warning-outline' },
];

const HAZARD_CATEGORIES = [
  'Fall Protection',
  'Electrical',
  'Excavation',
  'Confined Space',
  'PPE',
  'Housekeeping',
  'Fire',
  'Chemical',
  'Equipment',
  'Weather',
  'Other',
];

export default function SafetyScreen() {
  const [formType, setFormType] = useState<FormType | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Form fields
  const [topic, setTopic] = useState('');
  const [attendeeCount, setAttendeeCount] = useState('');
  const [notes, setNotes] = useState('');
  const [hazards, setHazards] = useState<string[]>([]);
  const [actionRequired, setActionRequired] = useState(false);
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('low');
  const [description, setDescription] = useState('');

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: queryKeys.projects,
    queryFn: api.projects.list,
  });

  const activeProjects = projects.filter((p) => p.status === 'active');

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProject || !formType) throw new Error('No project or form type selected');
      const payload = {
        project_id: selectedProject,
        form_type: formType as string,
        topic: topic || undefined,
        attendee_count: attendeeCount ? parseInt(attendeeCount, 10) : undefined,
        notes: notes || undefined,
        hazard_categories: hazards.length > 0 ? hazards : undefined,
        action_required: actionRequired,
        severity,
        description: description || undefined,
        submitted_at: new Date().toISOString(),
        source: 'mobile',
      };
      return api.safety.forms.create(selectedProject, payload);
    },
    onSuccess: () => {
      Alert.alert('Success', 'Safety form submitted.');
      resetForm();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to submit safety form. It has been queued for sync.');
    },
  });

  function resetForm() {
    setFormType(null);
    setTopic('');
    setAttendeeCount('');
    setNotes('');
    setHazards([]);
    setActionRequired(false);
    setSeverity('low');
    setDescription('');
  }

  function toggleHazard(h: string) {
    setHazards((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  }

  const isValid =
    selectedProject &&
    formType &&
    (formType === 'toolbox_talk' ? topic.trim().length > 0 : description.trim().length >= 10);

  if (!formType) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.header}>Safety Forms</Text>
        <Text style={styles.subtitle}>Select a form type to get started</Text>

        {FORM_TYPES.map((ft) => (
          <TouchableOpacity
            key={ft.key}
            style={styles.typeCard}
            onPress={() => setFormType(ft.key)}
            activeOpacity={0.7}
          >
            <View style={styles.typeIconWrap}>
              <Ionicons
                name={ft.icon as keyof typeof Ionicons.glyphMap}
                size={28}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.typeContent}>
              <Text style={styles.typeLabel}>{ft.label}</Text>
              <Text style={styles.typeDesc}>
                {ft.key === 'toolbox_talk' && 'Record a safety meeting or talk'}
                {ft.key === 'inspection' && 'Document a site safety inspection'}
                {ft.key === 'incident' && 'Report a safety incident or near-miss'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.formHeader}>
        <TouchableOpacity onPress={resetForm} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.formTitle}>{FORM_TYPES.find((f) => f.key === formType)?.label}</Text>
      </View>

      {/* Project Selector */}
      <Text style={styles.label}>Project *</Text>
      {projectsLoading ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {activeProjects.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, selectedProject === p.id && styles.chipSelected]}
              onPress={() => setSelectedProject(p.id)}
            >
              <Text
                style={[styles.chipText, selectedProject === p.id && styles.chipTextSel]}
                numberOfLines={1}
              >
                {p.project_number}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Toolbox Talk Fields */}
      {formType === 'toolbox_talk' && (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Topic *</Text>
            <TextInput
              style={styles.input}
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g., Fall protection procedures"
              placeholderTextColor={COLORS.muted}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Attendees</Text>
            <TextInput
              style={styles.input}
              value={attendeeCount}
              onChangeText={setAttendeeCount}
              placeholder="Number of attendees"
              placeholderTextColor={COLORS.muted}
              keyboardType="number-pad"
            />
          </View>
        </>
      )}

      {/* Inspection / Incident Fields */}
      {(formType === 'inspection' || formType === 'incident') && (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Description * (min 10 chars)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder={
                formType === 'inspection'
                  ? 'Describe inspection findings...'
                  : 'Describe the incident or near-miss...'
              }
              placeholderTextColor={COLORS.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Hazard Categories</Text>
            <View style={styles.hazardGrid}>
              {HAZARD_CATEGORIES.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[styles.hazardChip, hazards.includes(h) && styles.hazardChipSel]}
                  onPress={() => toggleHazard(h)}
                >
                  <Text style={[styles.hazardText, hazards.includes(h) && styles.hazardTextSel]}>
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {formType === 'incident' && (
            <View style={styles.field}>
              <Text style={styles.label}>Severity</Text>
              <View style={styles.severityRow}>
                {(['low', 'medium', 'high'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.severityBtn,
                      severity === s && {
                        borderColor: SEVERITY_COLORS[s],
                        backgroundColor: SEVERITY_COLORS[s] + '15',
                      },
                    ]}
                    onPress={() => setSeverity(s)}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        severity === s && {
                          color: SEVERITY_COLORS[s],
                          fontWeight: '700' as const,
                        },
                      ]}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.actionRow}>
            <Text style={styles.label}>Action Required</Text>
            <Switch
              value={actionRequired}
              onValueChange={setActionRequired}
              trackColor={{ true: COLORS.primary }}
            />
          </View>
        </>
      )}

      {/* Notes (all form types) */}
      <View style={styles.field}>
        <Text style={styles.label}>Additional Notes</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional notes..."
          placeholderTextColor={COLORS.muted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (!isValid || submitMutation.isPending) && styles.submitDisabled,
        ]}
        onPress={() => submitMutation.mutate()}
        disabled={!isValid || submitMutation.isPending}
        activeOpacity={0.8}
      >
        {submitMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Submit Safety Form</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const SEVERITY_COLORS = {
  low: COLORS.success,
  medium: COLORS.warning,
  high: COLORS.danger,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  header: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  subtitle: { fontSize: 14, color: COLORS.muted, marginBottom: SPACING.lg },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  typeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeContent: { flex: 1 },
  typeLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  typeDesc: { fontSize: 13, color: COLORS.muted, marginTop: 2 },

  // Form
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  backBtn: { padding: SPACING.xs },
  formTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  field: { marginBottom: SPACING.md },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  textarea: { minHeight: 80 },
  chipScroll: { marginBottom: SPACING.md },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  chipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  chipText: { fontSize: 13, color: COLORS.textSecondary },
  chipTextSel: { color: COLORS.primary, fontWeight: '600' },

  // Hazards
  hazardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  hazardChip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.background,
  },
  hazardChipSel: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.danger + '15',
  },
  hazardText: { fontSize: 12, color: COLORS.textSecondary },
  hazardTextSel: { color: COLORS.danger, fontWeight: '600' },

  // Severity
  severityRow: { flexDirection: 'row', gap: SPACING.sm },
  severityBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  severityText: { fontSize: 14, color: COLORS.textSecondary },

  // Action required
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  // Submit
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
