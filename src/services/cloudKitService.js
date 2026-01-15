import { NativeModules, Platform } from 'react-native';

const { CloudKitManager } = NativeModules;

// Check if CloudKit is available (iOS only)
export async function checkCloudKitAvailability() {
  if (Platform.OS !== 'ios') {
    return { available: false, status: 'notIOS' };
  }

  if (!CloudKitManager) {
    return { available: false, status: 'moduleNotLoaded' };
  }

  try {
    return await CloudKitManager.checkAvailability();
  } catch (error) {
    console.log('CloudKit availability check failed:', error);
    return { available: false, status: 'error', error: error.message };
  }
}

// Upload a shared vacation record
export async function uploadSharedVacation(vacationData) {
  const { shareId, locationName, startDate, endDate, photoCount } = vacationData;

  return await CloudKitManager.uploadSharedVacation(
    shareId,
    locationName,
    startDate.getTime(),
    endDate.getTime(),
    photoCount
  );
}

// Upload a single photo
export async function uploadPhoto(shareId, photoPath, orderIndex, width, height) {
  return await CloudKitManager.uploadPhoto(
    shareId,
    photoPath,
    orderIndex,
    width,
    height
  );
}

// Fetch a shared vacation by shareId
export async function fetchSharedVacation(shareId) {
  const result = await CloudKitManager.fetchSharedVacation(shareId);

  return {
    shareId: result.shareId,
    locationName: result.locationName,
    startDate: new Date(result.startDate),
    endDate: new Date(result.endDate),
    photoCount: result.photoCount,
  };
}

// Fetch all photos for a shared vacation
export async function fetchSharedPhotos(shareId) {
  const photos = await CloudKitManager.fetchSharedPhotos(shareId);

  return photos.map(photo => ({
    orderIndex: photo.orderIndex,
    width: photo.width,
    height: photo.height,
    localPath: photo.localPath,
  }));
}

// Generate a share link
export function generateShareLink(shareId) {
  return `vacationphotos://share/${shareId}`;
}

// Parse a share link to extract shareId
export function parseShareLink(url) {
  if (!url) return null;

  // Handle custom scheme: vacationphotos://share/{shareId}
  const customSchemeMatch = url.match(/^vacationphotos:\/\/share\/([a-zA-Z0-9-]+)/);
  if (customSchemeMatch) {
    return customSchemeMatch[1];
  }

  // Handle HTTPS fallback: https://apps.apple.com/...?shareId={shareId}
  const httpsMatch = url.match(/[?&]shareId=([a-zA-Z0-9-]+)/);
  if (httpsMatch) {
    return httpsMatch[1];
  }

  return null;
}

export default {
  checkCloudKitAvailability,
  uploadSharedVacation,
  uploadPhoto,
  fetchSharedVacation,
  fetchSharedPhotos,
  generateShareLink,
  parseShareLink,
};
