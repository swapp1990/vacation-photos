import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';

// Cache for photo URIs to avoid refetching
export const uriCache = new Map();

// Timeout wrapper for async operations
const withTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    ),
  ]);
};

// Process a single photo asset - fetch info and cache URI
export const processAsset = async (asset) => {
  try {
    // 5 second timeout per photo to avoid iCloud photos blocking everything
    const info = await withTimeout(
      MediaLibrary.getAssetInfoAsync(asset.id),
      5000
    );
    const photoUri = info.localUri || info.uri;

    if (photoUri) {
      uriCache.set(asset.id, photoUri);
    }

    return { asset, info, photoUri };
  } catch (e) {
    // Silently skip photos that timeout or fail
    return null;
  }
};

// Process photos in parallel batches
export const processPhotosInBatches = async (assets, batchSize = 15, onProgress) => {
  const results = [];

  for (let i = 0; i < assets.length; i += batchSize) {
    const batch = assets.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processAsset));
    results.push(...batchResults.filter(Boolean));

    if (onProgress) {
      onProgress(Math.min(i + batchSize, assets.length), assets.length);
    }
  }

  return results;
};

// Geocode a location
export const geocodeLocation = async (latitude, longitude) => {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: Number(latitude),
      longitude: Number(longitude),
    });

    if (results && results.length > 0) {
      const place = results[0];
      const name = place.city || place.district || place.subregion || place.name;
      const region = place.region || place.administrativeArea;
      const country = place.country || place.isoCountryCode;
      return [name, region, country].filter(Boolean).join(', ');
    }
    return null;
  } catch (e) {
    console.log('Geocode error:', e.message);
    return null;
  }
};

// Geocode multiple clusters in parallel
export const geocodeClustersInParallel = async (clusters) => {
  const clustersToGeocode = clusters.filter(
    c => c.location && c.location.latitude != null && !c.locationName
  );

  if (clustersToGeocode.length === 0) return;

  await Promise.all(clustersToGeocode.map(async (cluster) => {
    const locationName = await geocodeLocation(
      cluster.location.latitude,
      cluster.location.longitude
    );
    if (locationName) {
      cluster.locationName = locationName;
      console.log('Location name:', locationName);
    }
  }));
};
