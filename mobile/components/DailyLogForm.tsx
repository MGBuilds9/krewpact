import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api, DailyLog, DailyLogCreate } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { COLORS, SPACING } from '@/constants/config';

const WEATHER_OPTIONS = ['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Snowy', 'Foggy'];

interface DailyLogFormProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DailyLogForm({ projectId, onClose, onSuccess }: DailyLogFormProps) {
  const qc = useQueryClient();
  const [workSummary, setWorkSummary] = useState('');
  const [weather, setWeather] = useState<string | null>(null);
  const [crewCount, setCrewCount] = useState('');
  const [delays, setDelays] = useState('');
  const [safetyNotes, setSafetyNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const payload: DailyLogCreate = {
        log_date: new Date().toISOString().split('T')[0],
        work_summary: workSummary || undefined,
        crew_count: crewCount ? parseInt(crewCount, 10) : undefined,
        weather: weather ? { condition: weather } : undefined,
        delays: delays || undefined,
        safety_notes: safetyNotes || undefined,
      };
      return api.projects.dailyLogs.create(projectId, payload);
    },
    onSuccess: (created) => {
      qc.setQueryData<DailyLog[]>(queryKeys.projectDailyLogs(projectId), (current) => [
        created,
        ...(current ?? []),
      ]);
      onSuccess();
    },
    onError: () => Alert.alert('Error', 'Failed to save daily log. Please try again.'),
  });

  const isValid = workSummary.trim().length >= 10;

  return (
    <View style={styles.container}>
      <View style={styles.handleBar} />

      <View style={styles.header}>
        <Text style={styles.title}>Daily Log</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Work Summary */}
        <View style={styles.field}>
          <Text style={styles.label}>Work Summary *</Text>
          <TextInput
            style={styles.textarea}
            value={workSummary}
            onChangeText={setWorkSummary}
            placeholder="Describe today's work on site (minimum 10 characters)..."
            placeholderTextColor={COLORS.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, workSummary.length < 10 && { color: COLORS.danger }]}>
            {workSummary.length} chars (min 10)
          </Text>
        </View>

        {/* Weather */}
        <View style={styles.field}>
          <Text style={styles.label}>Weather</Text>
          <View style={styles.chips}>
            {WEATHER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.chip, weather === option && styles.chipSelected]}
                onPress={() => setWeather(weather === option ? null : option)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, weather === option && styles.chipTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Crew Count */}
        <View style={styles.field}>
          <Text style={styles.label}>Crew on Site</Text>
          <TextInput
            style={styles.input}
            value={crewCount}
            onChangeText={setCrewCount}
            placeholder="0"
            placeholderTextColor={COLORS.muted}
            keyboardType="number-pad"
          />
        </View>

        {/* Delays */}
        <View style={styles.field}>
          <Text style={styles.label}>Delays</Text>
          <TextInput
            style={styles.input}
            value={delays}
            onChangeText={setDelays}
            placeholder="Any delays encountered?"
            placeholderTextColor={COLORS.muted}
          />
        </View>

        {/* Safety Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Safety Notes</Text>
          <TextInput
            style={styles.input}
            value={safetyNotes}
            onChangeText={setSafetyNotes}
            placeholder="Safety observations or incidents"
            placeholderTextColor={COLORS.muted}
          />
        </View>
      </ScrollView>

      {/* Submit */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, (!isValid || mutation.isPending) && styles.submitDisabled]}
          onPress={() => mutation.mutate()}
          disabled={!isValid || mutation.isPending}
          activeOpacity={0.8}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Save Daily Log</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  field: { marginBottom: SPACING.md },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  textarea: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 100,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  charCount: { fontSize: 12, color: COLORS.muted, marginTop: 4, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  chipText: { fontSize: 13, color: COLORS.textSecondary },
  chipTextSelected: { color: COLORS.primary, fontWeight: '600' },
  footer: { padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
