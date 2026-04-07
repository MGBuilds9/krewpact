import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api, Project } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { COLORS, SPACING } from '@/constants/config';
import { compressImage } from '@/lib/photo-utils';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_WIDTH - SPACING.md * 2 - SPACING.sm * 2) / 3;

interface SitePhoto {
  id: string;
  uri: string;
  project_id: string;
  caption: string | null;
  taken_at: string;
  is_synced: boolean;
}

export default function PhotosScreen() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [localPhotos, setLocalPhotos] = useState<SitePhoto[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: queryKeys.projects,
    queryFn: api.projects.list,
  });

  const activeProjects = projects.filter((p) => p.status === 'active');

  React.useEffect(() => {
    if (!selectedProject && activeProjects.length > 0) {
      setSelectedProject(activeProjects[0].id);
    }
  }, [activeProjects, selectedProject]);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take site photos.');
      return;
    }

    setIsCapturing(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        exif: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const compressed = await compressImage(asset.uri);

        const photo: SitePhoto = {
          id: `local-${Date.now()}`,
          uri: compressed.uri,
          project_id: selectedProject ?? '',
          caption: null,
          taken_at: new Date().toISOString(),
          is_synced: false,
        };
        setLocalPhotos((prev) => [photo, ...prev]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to capture photo.');
    } finally {
      setIsCapturing(false);
    }
  }, [selectedProject]);

  const pickFromLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to select photos.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 10,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newPhotos: SitePhoto[] = [];
        for (const asset of result.assets) {
          const compressed = await compressImage(asset.uri);
          newPhotos.push({
            id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            uri: compressed.uri,
            project_id: selectedProject ?? '',
            caption: null,
            taken_at: new Date().toISOString(),
            is_synced: false,
          });
        }
        setLocalPhotos((prev) => [...newPhotos, ...prev]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to select photos.');
    }
  }, [selectedProject]);

  const renderPhoto = useCallback(
    ({ item }: { item: SitePhoto }) => (
      <View style={styles.photoWrapper}>
        <Image source={{ uri: item.uri }} style={styles.photo} />
        {!item.is_synced && (
          <View style={styles.syncBadge}>
            <Ionicons name="cloud-upload-outline" size={12} color="#fff" />
          </View>
        )}
      </View>
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Site Photos</Text>
        <Text style={styles.photoCount}>
          {localPhotos.length} photo{localPhotos.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Project Selector */}
      {projectsLoading ? (
        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={{ marginBottom: SPACING.md }}
        />
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={activeProjects}
          keyExtractor={(p) => p.id}
          style={styles.projectPicker}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, selectedProject === item.id && styles.chipSelected]}
              onPress={() => setSelectedProject(item.id)}
            >
              <Text style={[styles.chipText, selectedProject === item.id && styles.chipTextSel]}>
                {item.project_number}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.captureButton, !selectedProject && styles.buttonDisabled]}
          onPress={takePhoto}
          disabled={!selectedProject || isCapturing}
          activeOpacity={0.7}
        >
          {isCapturing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.captureText}>Take Photo</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.libraryButton, !selectedProject && styles.buttonDisabled]}
          onPress={pickFromLibrary}
          disabled={!selectedProject}
          activeOpacity={0.7}
        >
          <Ionicons name="images-outline" size={20} color={COLORS.primary} />
          <Text style={styles.libraryText}>Library</Text>
        </TouchableOpacity>
      </View>

      {/* Photo Grid */}
      {localPhotos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="camera-outline" size={48} color={COLORS.muted} />
          <Text style={styles.emptyText}>
            No photos yet.{'\n'}Take a photo or pick from your library.
          </Text>
        </View>
      ) : (
        <FlatList
          data={localPhotos.filter((p) => p.project_id === selectedProject)}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.photoRow}
          contentContainerStyle={styles.photoGrid}
          renderItem={renderPhoto}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: SPACING.md,
    paddingBottom: 0,
  },
  header: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  photoCount: { fontSize: 14, color: COLORS.muted },

  projectPicker: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxHeight: 50,
  },
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

  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  captureButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
  },
  captureText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  libraryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 12,
  },
  libraryText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  buttonDisabled: { opacity: 0.4 },

  photoGrid: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl },
  photoRow: { gap: SPACING.sm, marginBottom: SPACING.sm },
  photoWrapper: { position: 'relative' },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  syncBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
