import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'vacation_photos_cache';

/**
 * Cache structure:
 * {
 *   photos: [{ id, creationTime, location, distanceFromHome }],
 *   clusters: [{ id, photoIds, startDate, endDate, location, locationName, isVacation, days }],
 *   homeLocation: { latitude, longitude },
 *   newestPhotoTime: timestamp,  // for incremental refresh
 *   oldestPhotoTime: timestamp,  // for load more
 *   endCursor: string,           // for pagination
 *   lastUpdated: timestamp
 * }
 */

export async function loadCache() {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      // Convert date strings back to Date objects in clusters
      if (data.clusters) {
        data.clusters = data.clusters.map(cluster => ({
          ...cluster,
          startDate: new Date(cluster.startDate),
          endDate: new Date(cluster.endDate),
        }));
      }
      return data;
    }
  } catch (e) {
    console.log('Error loading cache:', e.message);
  }
  return null;
}

export async function saveCache(data) {
  try {
    // Prepare clusters for storage (dates to strings)
    const storageData = {
      ...data,
      clusters: data.clusters?.map(cluster => ({
        ...cluster,
        startDate: cluster.startDate.toISOString(),
        endDate: cluster.endDate.toISOString(),
      })),
      lastUpdated: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(storageData));
  } catch (e) {
    console.log('Error saving cache:', e.message);
  }
}

export async function clearCache() {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.log('Error clearing cache:', e.message);
  }
}

// Extract minimal photo metadata for caching (no actual image data)
export function extractPhotoMetadata(photo) {
  return {
    id: photo.id,
    creationTime: photo.creationTime,
    location: photo.location,
    distanceFromHome: photo.distanceFromHome,
    // We don't cache localUri - it's fetched fresh each time
  };
}

// Extract cluster data with photo IDs only (not full photo objects)
export function extractClusterMetadata(cluster) {
  return {
    id: cluster.id,
    photoIds: cluster.photos.map(p => p.id),
    startDate: cluster.startDate,
    endDate: cluster.endDate,
    location: cluster.location,
    locationName: cluster.locationName,
    isVacation: cluster.isVacation,
    days: cluster.days,
  };
}

// Rebuild clusters with full photo objects from cached metadata
export function rebuildClusters(clusterMetadata, photosById) {
  return clusterMetadata.map(cluster => ({
    ...cluster,
    photos: cluster.photoIds
      .map(id => photosById[id])
      .filter(Boolean), // Filter out any missing photos
  }));
}
