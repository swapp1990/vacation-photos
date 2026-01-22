import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { fetchSharedVacation, fetchSharedPhotos } from './cloudKitService';

const BATCH_SIZE = 3;

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

    // Check if file exists
    const exists = await fileExists(photoLocalPath);
    if (!exists) {
      return {
        success: false,
        error: 'Photo file not found. Please reload the vacation and try again.',
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
          // Check if file exists before trying to save
          const exists = await fileExists(photo.localPath);
          if (!exists) {
            throw new Error('File not found');
          }

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

    // If any failures were due to missing files, add helpful message
    const missingFiles = failures.some(f => f.error === 'File not found');
    const errorMessage = missingFiles
      ? 'Some photos could not be saved. Please reload the vacation and try again.'
      : undefined;

    return {
      success: failures.length === 0,
      savedCount: successCount,
      failedCount: failures.length,
      error: errorMessage,
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
