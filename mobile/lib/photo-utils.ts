/**
 * Photo utilities for field worker camera integration.
 *
 * Compresses images to < 2MB for reliable upload on construction
 * site bandwidth. Uses expo-image-manipulator for resize + compress.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

/** Maximum file size in bytes (2MB) */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

/** Maximum dimension (width or height) */
const MAX_DIMENSION = 1920;

/** JPEG quality levels to try (descending) */
const QUALITY_LEVELS = [0.8, 0.6, 0.4, 0.3];

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
}

/**
 * Compress an image to under MAX_FILE_SIZE.
 *
 * Strategy:
 * 1. Resize to MAX_DIMENSION if larger
 * 2. Compress with decreasing JPEG quality until under 2MB
 * 3. Returns the compressed URI and metadata
 */
export async function compressImage(
  sourceUri: string,
): Promise<CompressedImage> {
  // First pass: resize if needed, compress at 0.8
  let result = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: MAX_DIMENSION } }],
    {
      compress: QUALITY_LEVELS[0],
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  let fileInfo = await FileSystem.getInfoAsync(result.uri);
  let fileSize = fileInfo.exists ? (fileInfo.size ?? 0) : 0;

  // If still too large, try lower quality levels
  for (let i = 1; i < QUALITY_LEVELS.length; i++) {
    if (fileSize <= MAX_FILE_SIZE) break;

    result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: MAX_DIMENSION } }],
      {
        compress: QUALITY_LEVELS[i],
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );

    fileInfo = await FileSystem.getInfoAsync(result.uri);
    fileSize = fileInfo.exists ? (fileInfo.size ?? 0) : 0;
  }

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    fileSize,
  };
}

/**
 * Get the file size of an image URI.
 * Returns 0 if the file doesn't exist or size is unknown.
 */
export async function getImageFileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? (info.size ?? 0) : 0;
  } catch {
    return 0;
  }
}

/**
 * Format bytes to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
