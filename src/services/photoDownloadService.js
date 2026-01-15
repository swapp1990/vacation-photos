import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { fetchSharedVacation, fetchSharedPhotos } from './cloudKitService';

const BATCH_SIZE = 3;

// Request permission to save photos to device
async function requestMediaLibraryPermission() {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
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

// Save a single photo to device Photos library
export async function savePhotoToDevice(photoLocalPath) {
  try {
    // Check permission
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) {
      return {
        success: false,
        error: 'Permission denied to save photos',
      };
    }

    // Save to Photos library
    const asset = await MediaLibrary.createAssetAsync(photoLocalPath);

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
export async function saveAllPhotosToDevice(photos, onProgress) {
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
          const asset = await MediaLibrary.createAssetAsync(photo.localPath);
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
