import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, TimeEntry } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/config';

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function TimeEntryRow({ entry }: { entry: TimeEntry }) {
  return (
    <View style={styles.entryRow}>
      <View style={styles.entryTimes}>
        <Text style={styles.entryTime}>{formatTime(entry.clock_in)}</Text>
        <Ionicons name="arrow-forward" size={14} color={COLORS.muted} />
        <Text style={styles.entryTime}>
          {entry.clock_out ? formatTime(entry.clock_out) : '—'}
        </Text>
      </View>
      <Text style={styles.entryDuration}>
        {entry.duration_minutes ? formatDuration(entry.duration_minutes) : 'Active'}
      </Text>
    </View>
  );
}

export default function TimeScreen() {
  const qc = useQueryClient();
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);

  const { data: entries = [], isFetching, refetch } = useQuery<TimeEntry[]>({
    queryKey: queryKeys.timesheets,
    queryFn: async () => {
      // Fetch today's entries from the timesheets list endpoint
      return apiFetchTimesheets();
    },
  });

  // Detect active entry from loaded entries
  const currentActive = entries.find((e) => !e.clock_out) ?? activeEntry;

  const clockInMutation = useMutation({
    mutationFn: () => api.timesheets.clockIn({}),
    onSuccess: (entry) => {
      setActiveEntry(entry);
      qc.invalidateQueries({ queryKey: queryKeys.timesheets });
    },
    onError: () => Alert.alert('Error', 'Failed to clock in. Please try again.'),
  });

  const clockOutMutation = useMutation({
    mutationFn: (id: string) => api.timesheets.clockOut(id),
    onSuccess: () => {
      setActiveEntry(null);
      qc.invalidateQueries({ queryKey: queryKeys.timesheets });
    },
    onError: () => Alert.alert('Error', 'Failed to clock out. Please try again.'),
  });

  const isClockedIn = Boolean(currentActive);
  const isWorking = clockInMutation.isPending || clockOutMutation.isPending;

  function handleToggle() {
    if (isClockedIn && currentActive) {
      clockOutMutation.mutate(currentActive.id);
    } else {
      clockInMutation.mutate();
    }
  }

  const todayEntries = entries.filter((e) => {
    const today = new Date().toDateString();
    return new Date(e.clock_in).toDateString() === today;
  });

  const todayMinutes = todayEntries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
    >
      <Text style={styles.header}>Time Tracking</Text>

      {/* Clock button */}
      <View style={styles.clockSection}>
        <TouchableOpacity
          style={[styles.clockButton, isClockedIn ? styles.clockButtonActive : styles.clockButtonInactive]}
          onPress={handleToggle}
          disabled={isWorking}
          activeOpacity={0.8}
        >
          {isWorking ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <>
              <Ionicons
                name={isClockedIn ? 'stop-circle' : 'play-circle'}
                size={48}
                color="#fff"
              />
              <Text style={styles.clockButtonText}>
                {isClockedIn ? 'Clock Out' : 'Clock In'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isClockedIn ? COLORS.success : COLORS.muted }]} />
          <Text style={styles.statusText}>
            {isClockedIn ? `Clocked in since ${formatTime(currentActive!.clock_in)}` : 'Not clocked in'}
          </Text>
        </View>

        {todayMinutes > 0 && (
          <Text style={styles.todayTotal}>Today: {formatDuration(todayMinutes)}</Text>
        )}
      </View>

      {/* Today's entries */}
      {todayEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Entries</Text>
          <View style={styles.entriesList}>
            {todayEntries.map((entry) => (
              <TimeEntryRow key={entry.id} entry={entry} />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// Stub — real implementation would call an actual list endpoint
async function apiFetchTimesheets(): Promise<TimeEntry[]> {
  return [];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  header: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.lg },
  clockSection: { alignItems: 'center', paddingVertical: SPACING.xl },
  clockButton: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  clockButtonActive: { backgroundColor: COLORS.danger },
  clockButtonInactive: { backgroundColor: COLORS.primary },
  clockButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.md },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, color: COLORS.textSecondary },
  todayTotal: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: SPACING.sm },
  section: { backgroundColor: COLORS.background, borderRadius: 12, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, marginTop: SPACING.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  entriesList: { gap: SPACING.xs },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.xs },
  entryTimes: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  entryTime: { fontSize: 14, color: COLORS.text },
  entryDuration: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
});
