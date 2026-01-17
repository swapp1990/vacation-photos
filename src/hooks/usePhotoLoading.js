import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadCache,
  saveCache,
  clearCache,
  extractPhotoMetadata,
  extractClusterMetadata,
  rebuildClusters,
} from '../utils/photoCache';
import {
  processAsset,
  geocodeClustersInParallel,
} from '../utils/photoProcessing';
import {
  clusterPhotos,
  getDistanceKm,
  MILES_FROM_HOME,
  KM_FROM_HOME,
} from '../utils/clusteringUtils';

const ONBOARDING_KEY = 'onboarding_complete';
const REFRESH_DEBOUNCE_MS = 30000; // 30 seconds minimum between auto-refreshes

/**
 * Hook for managing photo loading, clustering, and caching
 * This is the core hook for loading vacation photos from the device
 */
export function usePhotoLoading() {
  const [photos, setPhotos] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [hasPermission, setHasPermission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [endCursor, setEndCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [homeLocation, setHomeLocation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newestPhotoTime, setNewestPhotoTime] = useState(null);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(null);
  const [showLocationSelection, setShowLocationSelection] = useState(false);

  const lastRefreshRef = useRef(0);

  // Check if onboarding is complete
  const checkOnboarding = useCallback(async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (completed === 'true') {
        setShowOnboarding(false);
        return true;
      } else {
        setShowOnboarding(true);
        return false;
      }
    } catch (e) {
      setShowOnboarding(true);
      return false;
    }
  }, []);

  // Complete onboarding
  const handleGetStarted = useCallback(async () => {
    setShowOnboarding(false);
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setShowLocationSelection(true);
  }, []);

  // Handle location selection
  const handleLocationSelected = useCallback(async (location, initializeCallback) => {
    setShowLocationSelection(false);
    const home = {
      latitude: location.latitude,
      longitude: location.longitude,
    };
    setHomeLocation(home);
    setDetectedLocation(location.displayName);
    // Call initialize callback with home location
    if (initializeCallback) {
      initializeCallback(home);
    }
  }, []);

  // Request permissions
  const requestPermissions = useCallback(async (cached, selectedHome = null) => {
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();

    // Priority: selectedHome > cached.homeLocation > homeLocation state
    let home = selectedHome || cached?.homeLocation || homeLocation;

    // If no home location is set, show location selection screen
    if (locationStatus === 'granted' && !home) {
      console.log('[HOME] No home found, showing location selection...');
      setShowLocationSelection(true);
      return null;
    }

    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
    setHasPermission(mediaStatus === 'granted' && locationStatus === 'granted');

    return {
      hasPermission: mediaStatus === 'granted' && locationStatus === 'granted',
      home,
      hasCache: !!cached,
    };
  }, [homeLocation]);

  // Initialize the app
  const initializeApp = useCallback(async (selectedHome = null) => {
    // First, check if onboarding is complete
    const onboardingComplete = await checkOnboarding();
    if (!onboardingComplete) {
      // Onboarding will be shown, don't continue initialization
      return;
    }

    // Then, try to load cached data
    const cached = await loadCache();
    if (cached && cached.photos && cached.clusters) {
      console.log('Loaded from cache:', cached.photos.length, 'photos');
      // Build photos lookup
      const photosById = {};
      cached.photos.forEach(p => { photosById[p.id] = p; });
      // Rebuild clusters with full photo objects
      const rebuiltClusters = rebuildClusters(cached.clusters, photosById);
      setPhotos(cached.photos);
      setClusters(rebuiltClusters);
      setHomeLocation(cached.homeLocation);
      setNewestPhotoTime(cached.newestPhotoTime);
      setEndCursor(cached.endCursor);
      setHasMore(cached.hasMore !== false);
      setCacheLoaded(true);
    }

    // Then request permissions
    const result = await requestPermissions(cached, selectedHome);
    if (result && result.hasPermission && result.home && !cached) {
      // Only do full load if no cache exists
      loadPhotos('initial', result.home);
    }
  }, [checkOnboarding, requestPermissions]);

  // Main photo loading function
  const loadPhotos = useCallback(async (mode = 'initial', home = homeLocation) => {
    console.log('loadPhotos called with mode:', mode);
    if (!home) return;

    const isLoadMore = mode === 'loadMore';
    const isRefresh = mode === 'refresh';

    // Clear previous errors
    setError(null);

    if (isLoadMore) {
      setLoadingMore(true);
    } else if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setLoadingPercent(0);
    }
    setLoadingProgress(isRefresh ? 'Checking for new photos...' : 'Fetching photos...');

    try {
      const queryOptions = {
        mediaType: 'photo',
        first: isRefresh ? 500 : 300,
        sortBy: ['creationTime'],
      };

      if (isLoadMore && endCursor) {
        queryOptions.after = endCursor;
      }

      const result = await MediaLibrary.getAssetsAsync(queryOptions);
      const { assets, endCursor: newCursor, hasNextPage } = result;

      // For refresh, only process photos newer than what we have
      let assetsToProcess = assets;
      if (isRefresh && newestPhotoTime) {
        assetsToProcess = assets.filter(a => a.creationTime > newestPhotoTime);
        if (assetsToProcess.length === 0) {
          console.log('No new photos found');
          setRefreshing(false);
          return;
        }
        console.log(`Found ${assetsToProcess.length} new photos`);
      }

      if (!isRefresh) {
        setEndCursor(newCursor);
        setHasMore(hasNextPage);
      }

      setLoadingProgress('Finding vacation photos...');
      const vacationPhotos = [];
      let noLocationCount = 0;
      let tooCloseCount = 0;
      let processedCount = 0;
      let geocodedCount = 0;

      // Process photos in parallel batches
      const BATCH_SIZE = 15;

      for (let i = 0; i < assetsToProcess.length; i += BATCH_SIZE) {
        const batch = assetsToProcess.slice(i, i + BATCH_SIZE);

        const results = await Promise.all(batch.map(processAsset));

        for (const result of results) {
          if (!result) continue;

          const { asset, info, photoUri } = result;
          processedCount++;

          // Show photo thumbnails as we scan
          if (!isRefresh && photoUri && processedCount % BATCH_SIZE === 0) {
            setRecentPhotos(prev => [...prev.slice(-3), { id: asset.id, uri: photoUri }]);
          }

          // Include photos without location in a separate group
          if (!info.location || info.location.latitude == null) {
            noLocationCount++;
            vacationPhotos.push({
              ...asset,
              location: null,
              distanceFromHome: null,
            });
            continue;
          }

          const distanceFromHome = getDistanceKm(
            home.latitude,
            home.longitude,
            Number(info.location.latitude),
            Number(info.location.longitude)
          );

          if (distanceFromHome < KM_FROM_HOME) {
            tooCloseCount++;
            continue;
          }

          vacationPhotos.push({
            ...asset,
            location: info.location,
            distanceFromHome,
          });

          // Quick geocode first vacation photo to show during scanning
          if (!isRefresh && geocodedCount < 1 && info.location) {
            geocodedCount++;
            try {
              const results = await Location.reverseGeocodeAsync({
                latitude: Number(info.location.latitude),
                longitude: Number(info.location.longitude),
              });
              if (results && results.length > 0) {
                const place = results[0];
                const name = place.city || place.district || place.subregion || place.name;
                const country = place.country || place.isoCountryCode;
                const locationName = [name, country].filter(Boolean).join(', ');
                console.log('Early geocode:', locationName);
                setDetectedLocation(locationName);
                setLoadingProgress(`Found ${locationName}...`);
              }
            } catch (e) {
              console.log('Early geocode error:', e.message);
            }
          }
        }

        // Update progress after each batch
        if (!isRefresh) {
          const percent = Math.round((processedCount / assetsToProcess.length) * 100);
          setLoadingPercent(percent);
          setLoadingProgress(`Scanning photos... ${processedCount}/${assetsToProcess.length}`);
        }
      }

      console.log(`Processed: ${processedCount}, No location: ${noLocationCount}, Too close (<${MILES_FROM_HOME}mi): ${tooCloseCount}, Vacation photos: ${vacationPhotos.length}`);

      // Merge photos based on mode
      let allPhotos;
      if (isRefresh) {
        allPhotos = [...vacationPhotos, ...photos];
      } else if (isLoadMore) {
        allPhotos = [...photos, ...vacationPhotos];
      } else {
        allPhotos = vacationPhotos;
      }
      setPhotos(allPhotos);

      // Track newest photo time for incremental refresh
      if (allPhotos.length > 0) {
        const newest = Math.max(...allPhotos.map(p => p.creationTime));
        setNewestPhotoTime(newest);
      }

      setLoadingProgress('Clustering vacations...');
      const clustered = clusterPhotos(allPhotos);

      // Preserve locationName from existing clusters to avoid re-geocoding
      if (isLoadMore && clusters.length > 0) {
        for (const newCluster of clustered) {
          if (!newCluster.location) continue;

          for (const oldCluster of clusters) {
            if (!oldCluster.location || !oldCluster.locationName) continue;

            const distance = getDistanceKm(
              newCluster.location.latitude,
              newCluster.location.longitude,
              oldCluster.location.latitude,
              oldCluster.location.longitude
            );

            if (distance < 10) {
              newCluster.locationName = oldCluster.locationName;
              break;
            }
          }
        }
      }

      // Geocode clusters in parallel
      setLoadingProgress('Getting location names...');
      await geocodeClustersInParallel(clustered);

      // Update detected location with the first cluster's name
      const firstWithName = clustered.find(c => c.locationName);
      if (firstWithName) {
        setDetectedLocation(firstWithName.locationName);
      }

      setClusters(clustered);

      // Save to cache
      const cacheData = {
        photos: allPhotos.map(extractPhotoMetadata),
        clusters: clustered.map(extractClusterMetadata),
        homeLocation: home,
        newestPhotoTime: Math.max(...allPhotos.map(p => p.creationTime)),
        endCursor: newCursor,
        hasMore: hasNextPage,
      };
      await saveCache(cacheData);
      console.log('Saved to cache:', allPhotos.length, 'photos');

      if (isLoadMore) {
        setLoadingMore(false);
      } else if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading photos:', err);
      setError({
        message: 'Failed to load photos',
        details: err.message,
        retry: () => loadPhotos(mode, home),
      });
      if (isLoadMore) {
        setLoadingMore(false);
      } else if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [homeLocation, endCursor, newestPhotoTime, photos, clusters]);

  const onRefresh = useCallback(() => {
    loadPhotos('refresh', homeLocation);
  }, [loadPhotos, homeLocation]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadPhotos('loadMore', homeLocation);
    }
  }, [loadingMore, hasMore, loadPhotos, homeLocation]);

  // Clear all cached data
  const handleClearCache = useCallback(async () => {
    await clearCache();
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setPhotos([]);
    setClusters([]);
    setCacheLoaded(false);
    setRecentPhotos([]);
    setDetectedLocation(null);
    setHomeLocation(null);
    setShowLocationSelection(false);
    setShowOnboarding(true);
  }, []);

  // Update clusters (used by other hooks like useEditedLocations)
  const updateClusters = useCallback((newClusters) => {
    setClusters(newClusters);
  }, []);

  // Auto-refresh when app comes to foreground
  useEffect(() => {
    if (!homeLocation || photos.length === 0) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const now = Date.now();
        if (now - lastRefreshRef.current > REFRESH_DEBOUNCE_MS) {
          if (!loading && !loadingMore && !refreshing) {
            lastRefreshRef.current = now;
            console.log('App became active, checking for new photos...');
            loadPhotos('refresh', homeLocation);
          }
        }
      }
    });

    return () => subscription.remove();
  }, [homeLocation, photos.length, loading, loadingMore, refreshing, loadPhotos]);

  return {
    // State
    photos,
    clusters,
    hasPermission,
    loading,
    loadingMore,
    loadingProgress,
    loadingPercent,
    hasMore,
    homeLocation,
    refreshing,
    cacheLoaded,
    error,
    recentPhotos,
    detectedLocation,
    showOnboarding,
    showLocationSelection,
    newestPhotoTime,
    endCursor,

    // Actions
    loadPhotos,
    onRefresh,
    loadMore,
    initializeApp,
    checkOnboarding,
    handleGetStarted,
    handleLocationSelected,
    handleClearCache,
    updateClusters,
    setPhotos,
    setClusters,
    setHomeLocation,
    requestPermissions,
  };
}

export default usePhotoLoading;
