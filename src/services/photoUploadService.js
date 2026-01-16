import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadSharedVacation, uploadPhoto, generateShareLink } from './cloudKitService';

const USER_NAME_KEY = 'user_display_name';
const UPLOADED_VACATIONS_KEY = 'uploaded_vacations';

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

// Get or set user's display name
export async function getUserDisplayName() {
  try {
    const name = await AsyncStorage.getItem(USER_NAME_KEY);
    return name || 'A friend';
  } catch {
    return 'A friend';
  }
}

export async function setUserDisplayName(name) {
  try {
    await AsyncStorage.setItem(USER_NAME_KEY, name);
  } catch {
    // Ignore errors
  }
}

// Generate a unique key for a cluster based on location, dates, and photo count
function getClusterKey(cluster) {
  const startStr = cluster.startDate?.toISOString().split('T')[0] || '';
  const endStr = cluster.endDate?.toISOString().split('T')[0] || '';
  const photoCount = cluster.photos?.length || 0;
  const location = (cluster.locationName || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
  return `${location}_${startStr}_${endStr}_${photoCount}`;
}

// Get all uploaded vacations mapping
export async function getUploadedVacations() {
  try {
    const data = await AsyncStorage.getItem(UPLOADED_VACATIONS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

// Check if a cluster was already uploaded
async function getUploadedVacationShareId(clusterKey) {
  const uploaded = await getUploadedVacations();
  const entry = uploaded[clusterKey];
  return entry?.shareId || null;
}

// Save uploaded vacation mapping
async function saveUploadedVacation(clusterKey, shareId, uploadedCount, totalPhotos) {
  try {
    const uploaded = await getUploadedVacations();
    uploaded[clusterKey] = {
      shareId,
      uploadedCount,
      totalPhotos,
      uploadedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(UPLOADED_VACATIONS_KEY, JSON.stringify(uploaded));
  } catch {
    // Ignore errors
  }
}

// Main function to share a vacation cluster
export async function shareVacationCluster(cluster, onProgress) {
  const totalPhotos = cluster.photos?.length || 0;
  const clusterKey = getClusterKey(cluster);

  // Check if this vacation was already uploaded
  const existingShareId = await getUploadedVacationShareId(clusterKey);
  if (existingShareId) {
    // Already uploaded - return existing share info
    const uploaded = await getUploadedVacations();
    const entry = uploaded[clusterKey];
    return {
      success: true,
      shareId: existingShareId,
      shareLink: generateShareLink(existingShareId),
      photosUploaded: entry?.uploadedCount || Math.min(totalPhotos, MAX_PHOTOS),
      alreadyUploaded: true,
    };
  }

  // Generate new share ID for first-time upload
  const shareId = generateUUID();

  // Limit photos
  const photosToShare = cluster.photos.slice(0, MAX_PHOTOS);

  // Get user's display name
  const sharedBy = await getUserDisplayName();

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
      sharedBy,
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
      failures.slice(0, 3).forEach((f, i) => {
        console.log(`Photo upload error ${i + 1}:`, f.error);
      });
    }

    const successCount = uploadResults.filter(r => r.success).length;

    // Save the upload mapping for future reuse
    await saveUploadedVacation(clusterKey, shareId, successCount, totalPhotos);

    // Generate share link
    const shareLink = generateShareLink(shareId);

    return {
      success: true,
      shareId,
      shareLink,
      photosUploaded: successCount,
      photosFailed: failures.length,
      alreadyUploaded: false,
    };
  } catch (error) {
    console.log('Error sharing vacation:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Export getClusterKey for use by App.js to check upload status
export { getClusterKey };

export default {
  shareVacationCluster,
  getUserDisplayName,
  setUserDisplayName,
  getUploadedVacations,
  getClusterKey,
  MAX_PHOTOS,
};
