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
  Image,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api-client';
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
  const [summary, setSummary] = useState('');
  const [weather, setWeather] = useState<string | null>(null);
  const [workers, setWorkers] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      api.projects.dailyLogs.create(projectId, {
        summary,
        weather: weather ?? undefined,
        workers_on_site: workers ? parseInt(workers, 10) : undefined,
        photos,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projectDailyLogs(projectId) });
      onSuccess();
    },
    onError: () => Alert.alert('Error', 'Failed to save daily log. Please try again.'),
  });

  async function handlePickPhoto(fromCamera: boolean) {
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission required', fromCamera ? 'Camera access is needed.' : 'Photo library access is needed.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setPhotos((prev) => [...prev, ...uris].slice(0, 5));
    }
  }

  function removePhoto(uri: string) {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  }

  const isValid = summary.trim().length >= 10;

  return (
    <View style={styles.container}>
      {/* Handle bar */}
      <View style={styles.handleBar} />

      <View style={styles.header}>
        <Text style={styles.title}>Daily Log</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Summary */}
        <View style={styles.field}>
          <Text style={styles.label}>Summary *</Text>
          <TextInput
            style={styles.textarea}
            value={summary}
            onChangeText={setSummary}
            placeholder="Describe today's work on site (minimum 10 characters)..."
            placeholderTextColor={COLORS.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, summary.length < 10 && { color: COLORS.danger }]}>
            {summary.length} chars (min 10)
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

        {/* Workers */}
        <View style={styles.field}>
          <Text style={styles.label}>Workers on Site</Text>
          <TextInput
            style={styles.input}
            value={workers}
            onChangeText={setWorkers}
            placeholder="0"
            placeholderTextColor={COLORS.muted}
            keyboardType="number-pad"
          />
        </View>

        {/* Photos */}
        <View style={styles.field}>
          <Text style={styles.label}>Photos ({photos.length}/5)</Text>
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => handlePickPhoto(true)}
              disabled={photos.length >= 5}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
              <Text style={styles.photoButtonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => handlePickPhoto(false)}
              disabled={photos.length >= 5}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={20} color={COLORS.primary} />
              <Text style={styles.photoButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
          {photos.length > 0 && (
            <ScrollView horizontal style={styles.photoScroll} showsHorizontalScrollIndicator={false}>
              {photos.map((uri) => (
                <View key={uri} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoImage} />
                  <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(uri)}>
                    <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
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
  handleBar: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: SPACING.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  closeButton: { padding: SPACING.xs },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  field: { marginBottom: SPACING.md },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  textarea: { backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.sm, fontSize: 15, color: COLORS.text, minHeight: 100 },
  input: { backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.sm, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  charCount: { fontSize: 12, color: COLORS.muted, marginTop: 4, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: { borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.surface },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  chipText: { fontSize: 13, color: COLORS.textSecondary },
  chipTextSelected: { color: COLORS.primary, fontWeight: '600' },
  photoActions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  photoButton: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  photoButtonText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  photoScroll: { marginTop: SPACING.sm },
  photoThumb: { position: 'relative', marginRight: SPACING.sm },
  photoImage: { width: 80, height: 80, borderRadius: 8 },
  removePhoto: { position: 'absolute', top: -6, right: -6 },
  footer: { padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
