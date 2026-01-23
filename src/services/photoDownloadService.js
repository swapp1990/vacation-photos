import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { fetchSharedVacation, fetchSharedPhotos } from './cloudKitService';

const BATCH_SIZE = 3;

// Cache for re-fetched photos to avoid multiple re-downloads in same session
let refetchedPhotosCache = {};

// Request permission to save photos to device
async function requestMediaLibraryPermission() {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

// Check if a file exists at the given path
async function fileExists(filePath) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists;
  } catch {
    return false;
  }
}

// Download a shared vacation and its photos
export async function downloadSharedVacation(shareId) {
  try {
    // Fetch vacation metadata
    const vacation = await fetchSharedVacation(shareId);

    // Fetch photos
    const photos = await fetchSharedPhotos(shareId);

    // Sort by orderIndex
    photos.sort((a, b) => a.orderIndex - b.orderIndex);

    return {
      success: true,
      vacation,
      photos,
    };
  } catch (error) {
    console.log('Error downloading shared vacation:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Re-fetch photos from CloudKit and return the updated photo
async function refetchPhotoIfNeeded(shareId, orderIndex, currentPath) {
  // Check if file exists
  const exists = await fileExists(currentPath);
  if (exists) {
    return currentPath;
  }

  // Check cache first
  const cacheKey = `${shareId}_${orderIndex}`;
  if (refetchedPhotosCache[cacheKey]) {
    const cachedPath = refetchedPhotosCache[cacheKey];
    if (await fileExists(cachedPath)) {
      return cachedPath;
    }
  }

  // Re-fetch from CloudKit
  console.log(`Re-fetching photo ${orderIndex} for shareId ${shareId}`);
  const photos = await fetchSharedPhotos(shareId);
  const photo = photos.find(p => p.orderIndex === orderIndex);

  if (photo && photo.localPath) {
    refetchedPhotosCache[cacheKey] = photo.localPath;
    return photo.localPath;
  }

  return null;
}

// Save a single photo to device Photos library
export async function savePhotoToDevice(photo, shareId) {
  try {
    // Check permission
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      return {
        success: false,
        error: 'Permission denied to save photos',
      };
    }

    // Get valid path (re-fetch if needed)
    const localPath = await refetchPhotoIfNeeded(shareId, photo.orderIndex, photo.localPath);
    if (!localPath) {
      return {
        success: false,
        error: 'Could not download photo. Please try again.',
      };
    }

    // Save to Photos library
    const asset = await MediaLibrary.createAssetAsync(localPath);

    return {
      success: true,
      asset,
    };
  } catch (error) {
    console.log('Error saving photo to device:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Save multiple photos to device in batches
export async function saveAllPhotosToDevice(photos, shareId, onProgress) {
  try {
    // Check permission first
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      return {
        success: false,
        error: 'Permission denied to save photos',
      };
    }

    const results = [];
    let completed = 0;
    const total = photos.length;

    for (let i = 0; i < photos.length; i += BATCH_SIZE) {
      const batch = photos.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (photo) => {
        try {
          // Get valid path (re-fetch if needed)
          const localPath = await refetchPhotoIfNeeded(shareId, photo.orderIndex, photo.localPath);
          if (!localPath) {
            throw new Error('Could not download photo');
          }

          const asset = await MediaLibrary.createAssetAsync(localPath);
          completed++;
          if (onProgress) {
            onProgress(completed, total);
          }
          return { success: true, orderIndex: photo.orderIndex };
        } catch (error) {
          completed++;
          if (onProgress) {
            onProgress(completed, total);
          }
          return { success: false, orderIndex: photo.orderIndex, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const failures = results.filter(r => !r.success);
    const successCount = results.filter(r => r.success).length;

    return {
      success: failures.length === 0,
      savedCount: successCount,
      failedCount: failures.length,
      error: failures.length > 0 ? 'Some photos could not be saved' : undefined,
    };
  } catch (error) {
    console.log('Error saving photos to device:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  downloadSharedVacation,
  savePhotoToDevice,
  saveAllPhotosToDevice,
};
