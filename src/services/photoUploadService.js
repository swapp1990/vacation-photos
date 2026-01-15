import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { uploadSharedVacation, uploadPhoto, generateShareLink } from './cloudKitService';

// Simple UUID generator (v4-like)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const MAX_PHOTO_DIMENSION = 2048;
const JPEG_QUALITY = 0.8;
const BATCH_SIZE = 3;
export const MAX_PHOTOS = 50;

// Compress a photo for upload
async function compressPhoto(photoUri) {
  try {
    // Get original image info
    const result = await ImageManipulator.manipulateAsync(
      photoUri,
      [{ resize: { width: MAX_PHOTO_DIMENSION } }],
      { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );

    return result;
  } catch (error) {
    console.log('Error compressing photo:', error);
    throw error;
  }
}

// Get the local URI for a photo asset
async function getPhotoUri(photo) {
  try {
    const assetInfo = await MediaLibrary.getAssetInfoAsync(photo.id);
    return assetInfo.localUri || assetInfo.uri;
  } catch (error) {
    console.log('Error getting photo URI:', error);
    throw error;
  }
}

// Upload photos in batches
async function uploadPhotosInBatches(shareId, photos, onProgress) {
  const results = [];
  let completed = 0;
  const total = photos.length;

  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    const batch = photos.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (photo, batchIndex) => {
      const orderIndex = i + batchIndex;

      try {
        // Get photo URI
        const photoUri = await getPhotoUri(photo);

        // Compress photo
        const compressed = await compressPhoto(photoUri);

        // Upload to CloudKit
        const result = await uploadPhoto(
          shareId,
          compressed.uri.replace('file://', ''),
          orderIndex,
          compressed.width,
          compressed.height
        );

        // Skip cleanup - temp files are cleaned automatically
        // FileSystem.deleteAsync is deprecated in SDK 54

        completed++;
        if (onProgress) {
          onProgress(completed, total);
        }

        return { success: true, orderIndex, result };
      } catch (error) {
        completed++;
        if (onProgress) {
          onProgress(completed, total);
        }
        return { success: false, orderIndex, error: error.message };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

// Main function to share a vacation cluster
export async function shareVacationCluster(cluster, onProgress) {
  // Generate unique share ID
  const shareId = generateUUID();

  // Limit photos
  const photosToShare = cluster.photos.slice(0, MAX_PHOTOS);

  try {
    // Report initial progress
    if (onProgress) {
      onProgress('preparing', 0, photosToShare.length);
    }

    // Upload vacation metadata
    await uploadSharedVacation({
      shareId,
      locationName: cluster.locationName || 'Vacation Photos',
      startDate: cluster.startDate,
      endDate: cluster.endDate,
      photoCount: photosToShare.length,
    });

    if (onProgress) {
      onProgress('uploading', 0, photosToShare.length);
    }

    // Upload photos in batches
    const uploadResults = await uploadPhotosInBatches(
      shareId,
      photosToShare,
      (completed, total) => {
        if (onProgress) {
          onProgress('uploading', completed, total);
        }
      }
    );

    // Check for failures
    const failures = uploadResults.filter(r => !r.success);
    if (failures.length > 0) {
      console.log(`${failures.length} photos failed to upload`);
      // Log first few error messages for debugging
      failures.slice(0, 3).forEach((f, i) => {
        console.log(`Photo upload error ${i + 1}:`, f.error);
      });
    }

    const successCount = uploadResults.filter(r => r.success).length;

    // Generate share link
    const shareLink = generateShareLink(shareId);

    return {
      success: true,
      shareId,
      shareLink,
      photosUploaded: successCount,
      photosFailed: failures.length,
    };
  } catch (error) {
    console.log('Error sharing vacation:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  shareVacationCluster,
  MAX_PHOTOS,
};
