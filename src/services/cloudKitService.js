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
  const { shareId, locationName, startDate, endDate, photoCount, sharedBy } = vacationData;

  return await CloudKitManager.uploadSharedVacation(
    shareId,
    locationName,
    startDate.getTime(),
    endDate.getTime(),
    photoCount,
    sharedBy || 'Someone'
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
    sharedBy: result.sharedBy || 'Someone',
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

// Fetch preview photos (first 3) for notification banner
export async function fetchPreviewPhotos(shareId) {
  const photos = await CloudKitManager.fetchPreviewPhotos(shareId);

  return photos.map(photo => ({
    orderIndex: photo.orderIndex,
    width: photo.width,
    height: photo.height,
    localPath: photo.localPath,
  }));
}

// Domain for Universal Links (used by App Clip)
// Using GitHub Pages: https://swapp1990.github.io/share/{shareId}
const UNIVERSAL_LINK_DOMAIN = 'swapp1990.github.io';

// Generate a share link using Universal Links for App Clip support
export function generateShareLink(shareId) {
  // Use Universal Link format for App Clip compatibility
  return `https://${UNIVERSAL_LINK_DOMAIN}/share/${shareId}`;
}

// Generate legacy custom scheme link (for backward compatibility)
export function generateLegacyShareLink(shareId) {
  return `vacationphotos://share/${shareId}`;
}

// Parse a share link to extract shareId
export function parseShareLink(url) {
  if (!url) return null;

  // Handle GitHub Pages Universal Link: https://swapp1990.github.io/share/{shareId}
  const githubPagesMatch = url.match(/github\.io\/share\/([a-zA-Z0-9-]+)/);
  if (githubPagesMatch) {
    return githubPagesMatch[1];
  }

  // Handle any /share/{shareId} pattern
  const sharePathMatch = url.match(/\/share\/([a-zA-Z0-9-]+)/);
  if (sharePathMatch) {
    return sharePathMatch[1];
  }

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
  fetchPreviewPhotos,
  generateShareLink,
  generateLegacyShareLink,
  parseShareLink,
};
