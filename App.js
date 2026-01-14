import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  Text,
  View,
  FlatList,
  SectionList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Linking,
  Platform,
  AppState,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
// FaceDetector requires development build - not available in Expo Go
// We'll check at runtime if it actually works
let FaceDetector = null;
let faceDetectorAvailable = true; // Will be set to false if native module isn't available
try {
  FaceDetector = require('expo-face-detector');
} catch (e) {
  faceDetectorAvailable = false;
}

// Import reusable components and styles
import {
  Screen,
  LocationSelectionScreen,
  YearDetailView,
  ClusterCard,
  YearCard,
  CollapsedClusterCard,
  CollagePhoto,
  formatDateRange,
} from './src/components';
import styles, { imageSize } from './src/styles/appStyles';
import {
  loadCache,
  saveCache,
  clearCache,
  extractPhotoMetadata,
  extractClusterMetadata,
  rebuildClusters,
} from './src/utils/photoCache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  uriCache,
  processAsset,
  processPhotosInBatches,
  geocodeClustersInParallel,
} from './src/utils/photoProcessing';

const ONBOARDING_KEY = 'onboarding_complete';

// Debug mode - set to false for production
const DEBUG_MODE = __DEV__;

const { width } = Dimensions.get('window');

const MILES_FROM_HOME = 50;
const KM_FROM_HOME = MILES_FROM_HOME * 1.60934;

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Infer location for photos without location based on surrounding photos in time
function inferMissingLocations(photos) {
  if (photos.length === 0) return photos;

  // Sort by creation time
  const sorted = [...photos].sort((a, b) => a.creationTime - b.creationTime);

  // Time window for location inference (4 hours in milliseconds)
  const TIME_WINDOW_MS = 4 * 60 * 60 * 1000;

  let inferredCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const photo = sorted[i];

    // Skip if photo already has location
    if (photo.location) continue;

    const photoTime = photo.creationTime;

    // Look for nearest photo with location before and after
    let prevWithLocation = null;
    let nextWithLocation = null;

    // Search backwards for photo with location
    for (let j = i - 1; j >= 0; j--) {
      if (sorted[j].location) {
        prevWithLocation = sorted[j];
        break;
      }
    }

    // Search forwards for photo with location
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].location) {
        nextWithLocation = sorted[j];
        break;
      }
    }

    // Determine which nearby photo's location to use
    let locationSource = null;

    if (prevWithLocation && nextWithLocation) {
      // Both exist - check if they're in the same location (within 30 miles)
      const prevTime = prevWithLocation.creationTime;
      const nextTime = nextWithLocation.creationTime;
      const prevTimeDiff = photoTime - prevTime;
      const nextTimeDiff = nextTime - photoTime;

      // Check if both are within time window
      const prevInWindow = prevTimeDiff <= TIME_WINDOW_MS;
      const nextInWindow = nextTimeDiff <= TIME_WINDOW_MS;

      if (prevInWindow && nextInWindow) {
        // Check if prev and next are in the same general location
        const distance = getDistanceKm(
          prevWithLocation.location.latitude,
          prevWithLocation.location.longitude,
          nextWithLocation.location.latitude,
          nextWithLocation.location.longitude
        );

        if (distance <= 48) { // ~30 miles - same location
          // Use the closer one in time
          locationSource = prevTimeDiff <= nextTimeDiff ? prevWithLocation : nextWithLocation;
        }
        // If different locations, don't infer (could be in transit)
      } else if (prevInWindow) {
        locationSource = prevWithLocation;
      } else if (nextInWindow) {
        locationSource = nextWithLocation;
      }
    } else if (prevWithLocation) {
      const timeDiff = photoTime - prevWithLocation.creationTime;
      if (timeDiff <= TIME_WINDOW_MS) {
        locationSource = prevWithLocation;
      }
    } else if (nextWithLocation) {
      const timeDiff = nextWithLocation.creationTime - photoTime;
      if (timeDiff <= TIME_WINDOW_MS) {
        locationSource = nextWithLocation;
      }
    }

    // Assign inferred location
    if (locationSource) {
      photo.location = locationSource.location;
      photo.distanceFromHome = locationSource.distanceFromHome;
      photo.locationInferred = true; // Mark as inferred
      inferredCount++;
    }
  }

  if (inferredCount > 0) {
    console.log(`Inferred location for ${inferredCount} photos`);
  }

  return sorted;
}

function clusterPhotos(photosWithMeta) {
  if (photosWithMeta.length === 0) return [];

  // First, infer missing locations based on surrounding photos
  const photosWithInferred = inferMissingLocations(photosWithMeta);

  // Step 1: Group photos by day and calculate each day's location
  const dayGroups = {};
  let unknownLocationPhotos = [];

  for (const photo of photosWithInferred) {
    if (!photo.location) {
      unknownLocationPhotos.push(photo);
      continue;
    }

    const dateKey = new Date(photo.creationTime).toDateString();
    if (!dayGroups[dateKey]) {
      dayGroups[dateKey] = [];
    }
    dayGroups[dateKey].push(photo);
  }

  // Step 2: Create day-clusters with each day's centroid location
  const dayClusters = [];
  for (const dateKey in dayGroups) {
    const photos = dayGroups[dateKey];
    const date = new Date(dateKey);

    // Calculate centroid for this day's photos
    const avgLat = photos.reduce((sum, p) => sum + Number(p.location.latitude), 0) / photos.length;
    const avgLon = photos.reduce((sum, p) => sum + Number(p.location.longitude), 0) / photos.length;

    dayClusters.push({
      id: `day-${dayClusters.length}`,
      photos: photos,
      startDate: date,
      endDate: date,
      location: { latitude: avgLat, longitude: avgLon },
      locationName: null,
    });
  }

  // Sort day-clusters by date
  dayClusters.sort((a, b) => a.startDate - b.startDate);

  // Step 3: Merge adjacent day-clusters that are within 50km
  const CLUSTER_THRESHOLD_KM = 50;
  const clusters = [];

  for (const dayCluster of dayClusters) {
    let merged = false;

    // Try to merge with an existing cluster
    for (const cluster of clusters) {
      const distance = getDistanceKm(
        dayCluster.location.latitude,
        dayCluster.location.longitude,
        cluster.location.latitude,
        cluster.location.longitude
      );

      // Check if within distance AND dates are adjacent (within 1 day)
      const dayGap = Math.abs(dayCluster.startDate - cluster.endDate) / (1000 * 60 * 60 * 24);

      if (distance <= CLUSTER_THRESHOLD_KM && dayGap <= 1) {
        // Merge into existing cluster
        cluster.photos = [...cluster.photos, ...dayCluster.photos];
        if (dayCluster.endDate > cluster.endDate) {
          cluster.endDate = dayCluster.endDate;
        }
        // Keep the original cluster's location (from first day)
        merged = true;
        break;
      }
    }

    if (!merged) {
      clusters.push({
        id: `cluster-${clusters.length}`,
        photos: [...dayCluster.photos],
        startDate: dayCluster.startDate,
        endDate: dayCluster.endDate,
        location: dayCluster.location,
        locationName: null,
      });
    }
  }

  // Add unknown location cluster if it exists
  if (unknownLocationPhotos.length > 0) {
    const dates = unknownLocationPhotos.map(p => new Date(p.creationTime));
    clusters.push({
      id: 'cluster-unknown',
      photos: unknownLocationPhotos,
      startDate: new Date(Math.min(...dates)),
      endDate: new Date(Math.max(...dates)),
      location: null,
      locationName: 'Unknown Location',
    });
  }

  // Finalize clusters
  for (const cluster of clusters) {
    cluster.photos.sort((a, b) => new Date(a.creationTime) - new Date(b.creationTime));
    const days = Math.ceil((cluster.endDate - cluster.startDate) / (1000 * 60 * 60 * 24)) + 1;
    cluster.isVacation = cluster.photos.length >= 3;
    cluster.days = days;
  }

  // Merge clusters that are at the same location AND have overlapping dates
  const mergedClusters = mergeClusters(clusters);

  // Sort clusters by most recent first, but keep unknown location cluster last
  mergedClusters.sort((a, b) => {
    // Unknown location cluster always goes last
    if (a.id === 'cluster-unknown') return 1;
    if (b.id === 'cluster-unknown') return -1;
    return b.endDate - a.endDate;
  });

  return mergedClusters;
}

// Check if two date ranges overlap or are adjacent (within 1 day)
function datesOverlapOrAdjacent(start1, end1, start2, end2) {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  // Extend ranges by 1 day to catch adjacent trips
  const extendedStart1 = new Date(start1.getTime() - ONE_DAY_MS);
  const extendedEnd1 = new Date(end1.getTime() + ONE_DAY_MS);
  // Check if ranges overlap
  return extendedStart1 <= end2 && extendedEnd1 >= start2;
}

// Merge clusters that are at the same location AND have overlapping dates
function mergeClusters(clusters) {
  const MERGE_THRESHOLD_KM = 50; // ~31 miles - slightly higher than clustering to catch edge cases
  let merged = true;

  while (merged) {
    merged = false;
    for (let i = 0; i < clusters.length; i++) {
      if (!clusters[i].location) continue; // Skip unknown location cluster

      for (let j = i + 1; j < clusters.length; j++) {
        if (!clusters[j].location) continue;

        // Check location proximity
        const distance = getDistanceKm(
          clusters[i].location.latitude,
          clusters[i].location.longitude,
          clusters[j].location.latitude,
          clusters[j].location.longitude
        );

        // Check date overlap - only merge if same location AND dates overlap
        const datesMatch = datesOverlapOrAdjacent(
          clusters[i].startDate, clusters[i].endDate,
          clusters[j].startDate, clusters[j].endDate
        );

        if (distance <= MERGE_THRESHOLD_KM && datesMatch) {
          // Merge cluster j into cluster i
          clusters[i].photos = [...clusters[i].photos, ...clusters[j].photos];
          clusters[i].photos.sort((a, b) => a.creationTime - b.creationTime);

          // Update date range
          if (clusters[j].startDate < clusters[i].startDate) {
            clusters[i].startDate = clusters[j].startDate;
          }
          if (clusters[j].endDate > clusters[i].endDate) {
            clusters[i].endDate = clusters[j].endDate;
          }

          // Recalculate days
          clusters[i].days = Math.ceil(
            (clusters[i].endDate - clusters[i].startDate) / (1000 * 60 * 60 * 24)
          ) + 1;

          // Keep locationName if one has it
          if (!clusters[i].locationName && clusters[j].locationName) {
            clusters[i].locationName = clusters[j].locationName;
          }

          // Remove merged cluster
          clusters.splice(j, 1);
          merged = true;
          break;
        }
      }
      if (merged) break;
    }
  }

  return clusters;
}

// Get emoji and tagline based on location name
function getLocationVibe(locationName) {
  if (!locationName) return { emoji: '📍', tagline: 'Your memories' };

  const name = locationName.toLowerCase();

  // Check for location keywords
  if (name.includes('beach') || name.includes('coast') || name.includes('ocean') || name.includes('sea')) {
    return { emoji: '🏖️', tagline: 'Beach vibes from' };
  }
  if (name.includes('mountain') || name.includes('mount') || name.includes('peak') || name.includes('summit')) {
    return { emoji: '🏔️', tagline: 'Mountain adventure in' };
  }
  if (name.includes('lake') || name.includes('falls') || name.includes('river')) {
    return { emoji: '🌊', tagline: 'Waterside memories from' };
  }
  if (name.includes('forest') || name.includes('park') || name.includes('trail') || name.includes('canyon')) {
    return { emoji: '🌲', tagline: 'Nature escape to' };
  }
  if (name.includes('island')) {
    return { emoji: '🏝️', tagline: 'Island getaway to' };
  }
  if (name.includes('desert') || name.includes('valley')) {
    return { emoji: '🏜️', tagline: 'Desert adventure in' };
  }
  if (name.includes('snow') || name.includes('ski') || name.includes('winter')) {
    return { emoji: '❄️', tagline: 'Winter wonderland in' };
  }
  if (name.includes('vegas') || name.includes('casino')) {
    return { emoji: '🎰', tagline: 'Good times in' };
  }
  if (name.includes('disney') || name.includes('theme') || name.includes('world')) {
    return { emoji: '🎢', tagline: 'Fun times at' };
  }
  if (name.includes('new york') || name.includes('san francisco') || name.includes('los angeles') || name.includes('chicago')) {
    return { emoji: '🌆', tagline: 'City adventure in' };
  }

  // Default based on country
  if (name.includes('japan')) return { emoji: '🗾', tagline: 'Journey to' };
  if (name.includes('france') || name.includes('paris')) return { emoji: '🗼', tagline: 'Romance in' };
  if (name.includes('italy') || name.includes('rome')) return { emoji: '🍝', tagline: 'La dolce vita in' };
  if (name.includes('mexico')) return { emoji: '🌮', tagline: 'Fiesta in' };
  if (name.includes('hawaii')) return { emoji: '🌺', tagline: 'Aloha from' };
  if (name.includes('india')) return { emoji: '🕌', tagline: 'Incredible' };

  // Generic adventure
  return { emoji: '✈️', tagline: 'Your trip to' };
}

// Group photos by day for section list
function groupPhotosByDay(photos, tripStartDate) {
  const groups = {};

  photos.forEach(photo => {
    const date = new Date(photo.creationTime);
    const dateKey = date.toDateString();

    if (!groups[dateKey]) {
      groups[dateKey] = {
        date,
        photos: [],
      };
    }
    groups[dateKey].photos.push(photo);
  });

  // Convert to array and sort by date
  const sections = Object.values(groups)
    .sort((a, b) => a.date - b.date)
    .map((group, index) => {
      const dayOptions = { weekday: 'long', month: 'short', day: 'numeric' };
      const dayStr = group.date.toLocaleDateString('en-US', dayOptions);

      return {
        title: `Day ${index + 1}`,
        subtitle: dayStr,
        data: group.photos,
      };
    });

  return sections;
}

const PhotoThumbnail = memo(({ photo, onPress, size = imageSize }) => {
  const [uri, setUri] = useState(() => uriCache.get(photo.id) || null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (uri) return;

    const cached = uriCache.get(photo.id);
    if (cached) {
      setUri(cached);
      return;
    }

    let mounted = true;
    MediaLibrary.getAssetInfoAsync(photo.id)
      .then((info) => {
        const photoUri = info.localUri || info.uri;
        if (photoUri) {
          uriCache.set(photo.id, photoUri);
        }
        if (mounted) {
          setUri(photoUri);
        }
      })
      .catch((err) => {
        if (mounted) setLoadError(true);
      });
    return () => { mounted = false; };
  }, [photo.id, uri]);

  // Show iCloud placeholder if image failed to load
  if (loadError || !uri) {
    return (
      <View style={[styles.thumbnail, styles.icloudPlaceholder, { width: size, height: size }]}>
        {loadError && <Text style={styles.icloudIcon}>☁️</Text>}
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={() => onPress(uri)}>
      <Image
        source={{ uri }}
        style={[styles.thumbnail, { width: size, height: size }]}
        onError={() => setLoadError(true)}
      />
    </TouchableOpacity>
  );
});

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [hasPermission, setHasPermission] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
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
  const [recentPhotos, setRecentPhotos] = useState([]); // For loading screen preview
  const [detectedLocation, setDetectedLocation] = useState(null); // For loading screen
  const [photosWithFaces, setPhotosWithFaces] = useState({}); // Map of photoId -> hasFaces
  const [faceDetectionRunning, setFaceDetectionRunning] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(null); // null = loading, true = show, false = skip
  const [showLocationSelection, setShowLocationSelection] = useState(false);
  const [editingDayPhotos, setEditingDayPhotos] = useState(null); // Photos to update location for
  const [showLocationEditModal, setShowLocationEditModal] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);
  const [selectedEditLocation, setSelectedEditLocation] = useState(null);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null); // For viewing previous year's clusters

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (completed === 'true') {
        setShowOnboarding(false);
        initializeApp();
      } else {
        setShowOnboarding(true);
      }
    } catch (e) {
      setShowOnboarding(true);
    }
  };

  const handleGetStarted = async () => {
    setShowOnboarding(false);
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setShowLocationSelection(true);
  };

  const handleLocationSelected = async (location) => {
    setShowLocationSelection(false);
    const home = {
      latitude: location.latitude,
      longitude: location.longitude,
    };
    setHomeLocation(home);
    setDetectedLocation(location.displayName);
    // Pass home directly to avoid stale state issues
    initializeApp(home);
  };

  // Search for locations using Nominatim API
  const searchLocations = async (query) => {
    if (!query || query.length < 2) {
      setLocationSearchResults([]);
      return;
    }

    setSearchingLocation(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            'User-Agent': 'VacationPhotosApp/1.0',
          },
        }
      );
      const data = await response.json();
      setLocationSearchResults(data.map(item => ({
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      })));
    } catch (e) {
      console.log('Location search error:', e.message);
      setLocationSearchResults([]);
    }
    setSearchingLocation(false);
  };

  // Handle updating location for photos
  const handleLocationUpdate = async () => {
    if (!editingDayPhotos || !selectedEditLocation) return;

    // Update photos with new location
    const updatedPhotos = photos.map(photo => {
      if (editingDayPhotos.some(p => p.id === photo.id)) {
        return {
          ...photo,
          location: {
            latitude: selectedEditLocation.latitude,
            longitude: selectedEditLocation.longitude,
          },
          distanceFromHome: getDistanceKm(
            homeLocation.latitude,
            homeLocation.longitude,
            selectedEditLocation.latitude,
            selectedEditLocation.longitude
          ),
        };
      }
      return photo;
    });

    setPhotos(updatedPhotos);

    // Re-cluster with updated locations
    const clustered = clusterPhotos(updatedPhotos);

    // Preserve existing locationNames
    for (const newCluster of clustered) {
      if (!newCluster.location) continue;
      for (const oldCluster of clusters) {
        if (!oldCluster.location || !oldCluster.locationName) continue;
        const distance = getDistanceKm(
          newCluster.location.latitude, newCluster.location.longitude,
          oldCluster.location.latitude, oldCluster.location.longitude
        );
        if (distance < 10) {
          newCluster.locationName = oldCluster.locationName;
          break;
        }
      }
    }

    // Geocode new clusters
    await geocodeClustersInParallel(clustered);

    setClusters(clustered);

    // Update cache
    const cacheData = {
      photos: updatedPhotos.map(extractPhotoMetadata),
      clusters: clustered.map(extractClusterMetadata),
      homeLocation,
      newestPhotoTime,
      endCursor,
      hasMore,
    };
    await saveCache(cacheData);

    // Close modal
    setShowLocationEditModal(false);
    setEditingDayPhotos(null);
    setSelectedEditLocation(null);

    // If unknown location cluster is now empty, go back to main view
    const unknownCluster = clustered.find(c => c.id === 'cluster-unknown');
    if (!unknownCluster || unknownCluster.photos.length === 0) {
      setSelectedCluster(null);
    } else {
      setSelectedCluster(unknownCluster);
    }
  };

  // Background face detection - runs after initial load is complete
  useEffect(() => {
    if (!loading && !faceDetectionRunning && clusters.length > 0 && Object.keys(photosWithFaces).length === 0) {
      runBackgroundFaceDetection();
    }
  }, [loading, clusters]);

  // Auto-check for new photos when app comes to foreground
  const lastRefreshRef = useRef(0);
  const REFRESH_DEBOUNCE_MS = 30000; // 30 seconds minimum between auto-refreshes

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
  }, [homeLocation, photos.length, loading, loadingMore, refreshing]);

  const runBackgroundFaceDetection = async () => {
    // Check if FaceDetector module is available
    if (!faceDetectorAvailable || !FaceDetector || !FaceDetector.detectFacesAsync) {
      console.log('Face detection skipped (requires development build)');
      return;
    }

    setFaceDetectionRunning(true);

    // Get a test photo to verify FaceDetector actually works
    const testCluster = clusters.find(c => c.photos.length > 0);
    if (!testCluster) {
      setFaceDetectionRunning(false);
      return;
    }

    // Test with first photo to see if native module works
    try {
      const testInfo = await MediaLibrary.getAssetInfoAsync(testCluster.photos[0].id);
      const testUri = testInfo.localUri || testInfo.uri;
      if (testUri) {
        await FaceDetector.detectFacesAsync(testUri, {
          mode: FaceDetector.FaceDetectorMode.fast,
        });
      }
    } catch (e) {
      // Native module not available - disable face detection for this session
      faceDetectorAvailable = false;
      console.log('Face detection disabled (native module not available in Expo Go)');
      setFaceDetectionRunning(false);
      return;
    }

    console.log('Starting background face detection...');

    const facesMap = {};
    let processedCount = 0;
    let photosWithFacesCount = 0;

    // Process photos from each cluster to find ones with faces
    for (const cluster of clusters) {
      // Only check first 10 photos per cluster for performance
      const photosToCheck = cluster.photos.slice(0, 10);

      for (const photo of photosToCheck) {
        if (facesMap[photo.id] !== undefined) continue; // Already checked

        try {
          const info = await MediaLibrary.getAssetInfoAsync(photo.id);
          const uri = info.localUri || info.uri;

          if (uri) {
            const result = await FaceDetector.detectFacesAsync(uri, {
              mode: FaceDetector.FaceDetectorMode.fast,
              detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
              runClassifications: FaceDetector.FaceDetectorClassifications.none,
            });

            const hasFaces = result.faces && result.faces.length > 0;
            facesMap[photo.id] = hasFaces;

            if (hasFaces) {
              photosWithFacesCount++;
            }
          }
        } catch (e) {
          // Silently skip errors for individual photos
          facesMap[photo.id] = false;
        }

        processedCount++;

        // Update state periodically to show progress
        if (processedCount % 20 === 0) {
          setPhotosWithFaces({ ...facesMap });
        }
      }
    }

    setPhotosWithFaces(facesMap);
    setFaceDetectionRunning(false);
    console.log(`Face detection complete: ${photosWithFacesCount} photos with faces out of ${processedCount} checked`);
  };

  const initializeApp = async (selectedHome = null) => {
    // First, try to load cached data
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
    // Then request permissions (will refresh if needed)
    // Pass selectedHome if provided (from location selection), or use cached
    requestPermissions(cached, selectedHome);
  };

  const requestPermissions = async (cached, selectedHome = null) => {
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();

    // Priority: selectedHome > cached.homeLocation > homeLocation state
    let home = selectedHome || cached?.homeLocation || homeLocation;

    // If no home location is set, show location selection screen instead of auto-detecting
    if (locationStatus === 'granted' && !home) {
      console.log('[HOME] No home found, showing location selection...');
      setShowLocationSelection(true);
      return; // Don't proceed until user selects home
    }

    const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
    setHasPermission(mediaStatus === 'granted' && locationStatus === 'granted');

    // Only do full load if no cache exists
    if (mediaStatus === 'granted' && locationStatus === 'granted' && home && !cached) {
      loadPhotos('initial', home);
    }
  };

  const loadPhotos = async (mode = 'initial', home = homeLocation) => {
    // mode: 'initial' | 'refresh' | 'loadMore'
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
      first: isRefresh ? 500 : 300, // Smaller batch to avoid skipping photos on early break
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
    let geocodedCount = 0; // Track separately for early location display

    // Process photos in parallel batches for much faster loading
    const BATCH_SIZE = 15;

    for (let i = 0; i < assetsToProcess.length; i += BATCH_SIZE) {
      const batch = assetsToProcess.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const results = await Promise.all(batch.map(processAsset));

      for (const result of results) {
        if (!result) continue;

        const { asset, info, photoUri } = result;
        processedCount++;

        // Show photo thumbnails as we scan (every batch)
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

        // Quick geocode first vacation photo WITH location to show during scanning
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
      // Prepend new photos to existing ones
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

          if (distance < 10) { // Within 10km = same location
            newCluster.locationName = oldCluster.locationName;
            break;
          }
        }
      }
    }

    // Geocode clusters in parallel for faster loading
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
  };

  const onRefresh = useCallback(() => {
    loadPhotos('refresh');
  }, [photos, newestPhotoTime, homeLocation]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadPhotos('loadMore');
    }
  };

  const handleViewAll = useCallback((cluster) => {
    setSelectedCluster(cluster);
  }, []);

  const handleClearCache = async () => {
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
  };

  // Group clusters: current year shown individually, previous years as year cards
  const getGroupedClusterItems = () => {
    const currentYear = new Date().getFullYear();
    const currentYearClusters = [];
    const previousYearClusters = {}; // { year: [clusters] }
    let unknownCluster = null;

    for (const cluster of clusters) {
      if (cluster.id === 'cluster-unknown') {
        unknownCluster = cluster;
        continue;
      }

      const clusterYear = cluster.endDate.getFullYear();
      if (clusterYear === currentYear) {
        currentYearClusters.push(cluster);
      } else {
        if (!previousYearClusters[clusterYear]) {
          previousYearClusters[clusterYear] = [];
        }
        previousYearClusters[clusterYear].push(cluster);
      }
    }

    // Build final list: current year clusters, then year cards, then unknown
    const items = [...currentYearClusters];

    // Add year cards for previous years (sorted by year descending)
    const years = Object.keys(previousYearClusters).sort((a, b) => b - a);
    for (const year of years) {
      items.push({
        id: `year-${year}`,
        type: 'year',
        year: parseInt(year),
        clusters: previousYearClusters[year],
      });
    }

    // Unknown location cluster last
    if (unknownCluster) {
      items.push(unknownCluster);
    }

    return items;
  };

  const renderCluster = ({ item }) => {
    // Year card for previous years
    if (item.type === 'year') {
      return (
        <YearCard
          year={item.year}
          clusters={item.clusters}
          onPress={(year) => setSelectedYear(year)}
        />
      );
    }

    // Use collapsed card for unknown location cluster
    if (item.id === 'cluster-unknown') {
      return (
        <CollapsedClusterCard
          cluster={item}
          onViewAll={handleViewAll}
        />
      );
    }
    return (
      <ClusterCard
        cluster={item}
        onViewAll={handleViewAll}
        photosWithFaces={photosWithFaces}
      />
    );
  };

  // Onboarding screen for first-time users
  if (showOnboarding === null) {
    // Still checking onboarding status
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" />
        <Image
          source={require('./assets/vacation-splash.png')}
          style={styles.splashImage}
          resizeMode="cover"
        />
      </View>
    );
  }

  if (showOnboarding === true) {
    return (
      <SafeAreaProvider>
        <View style={styles.onboardingContainer}>
          <StatusBar style="light" />
          <Image
            source={require('./assets/vacation-splash.png')}
            style={styles.onboardingBackground}
            resizeMode="cover"
          />
          <SafeAreaView style={styles.onboardingOverlay} edges={['bottom']}>
            <View style={styles.onboardingBottom}>
              <Text style={styles.onboardingTagline}>
                Your trips are hiding in your camera roll. Let's find them.
              </Text>
              <View style={styles.onboardingFeatures}>
                <Text style={styles.onboardingFeatureText}>✨ Magically finds photos from your adventures</Text>
                <Text style={styles.onboardingFeatureText}>🗺️ Groups them by where you went</Text>
                <Text style={styles.onboardingFeatureText}>🔐 Everything stays on your phone</Text>
              </View>
              <TouchableOpacity style={styles.onboardingButton} onPress={handleGetStarted}>
                <Text style={styles.onboardingButtonText}>Let's Go!</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    );
  }

  if (showLocationSelection) {
    return (
      <SafeAreaProvider>
        <LocationSelectionScreen onLocationSelected={handleLocationSelected} />
      </SafeAreaProvider>
    );
  }

  if (hasPermission === null) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.centerContainer} edges={['top', 'bottom']}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.message}>Setting things up...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (hasPermission === false) {
    const openSettings = () => {
      if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
      } else {
        Linking.openSettings();
      }
    };

    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.centerContainer} edges={['top', 'bottom']}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Permission Required</Text>
          <Text style={styles.permissionMessage}>
            To find your vacation photos, this app needs access to your photo library and location.
          </Text>
          <TouchableOpacity style={styles.button} onPress={openSettings}>
            <Text style={styles.buttonText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => requestPermissions(null)}>
            <Text style={styles.secondaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (selectedImage) {
    return (
      <Screen.Fullscreen onClose={() => setSelectedImage(null)}>
        <Image
          source={{ uri: selectedImage }}
          style={styles.fullImage}
          resizeMode="contain"
        />
      </Screen.Fullscreen>
    );
  }

  // Cluster detail view - show photos for a specific cluster
  // NOTE: This must come before selectedYear check so clicking a cluster
  // from within the year view shows the cluster detail on top
  if (selectedCluster) {
    const vibe = getLocationVibe(selectedCluster.locationName);
    const locationCity = selectedCluster.locationName?.split(',')[0] || 'Trip';
    const photosByDay = groupPhotosByDay(selectedCluster.photos, selectedCluster.startDate);

    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <StatusBar style="auto" />
          <View style={styles.tripHeader}>
            <TouchableOpacity onPress={() => setSelectedCluster(null)} style={styles.backButtonContainer}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <View style={styles.tripHeaderContent}>
              <Text style={styles.tripEmoji}>{vibe.emoji}</Text>
              <Text style={styles.tripTagline}>{vibe.tagline}</Text>
              <Text style={styles.tripTitle}>{locationCity}</Text>
              <Text style={styles.tripMeta}>
                {formatDateRange(selectedCluster.startDate, selectedCluster.endDate)}
                {' · '}{selectedCluster.photos.length} photos
                {selectedCluster.days > 1 ? ` · ${selectedCluster.days} days` : ''}
              </Text>
            </View>
          </View>
          <SectionList
            sections={photosByDay}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section }) => (
              <View style={styles.daySectionHeader}>
                <View style={styles.daySectionTitleRow}>
                  <View>
                    <Text style={styles.daySectionTitle}>{section.title}</Text>
                    <Text style={styles.daySectionSubtitle}>{section.subtitle}</Text>
                  </View>
                  {selectedCluster.id === 'cluster-unknown' && (
                    <TouchableOpacity
                      style={styles.addLocationButton}
                      onPress={() => {
                        setEditingDayPhotos(section.data);
                        setLocationSearchQuery('');
                        setLocationSearchResults([]);
                        setSelectedEditLocation(null);
                        setShowLocationEditModal(true);
                      }}
                    >
                      <Text style={styles.addLocationButtonText}>+ Add Location</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            renderItem={({ item, index, section }) => {
              // Render 3 photos per row
              if (index % 3 !== 0) return null;
              const rowPhotos = section.data.slice(index, index + 3);
              return (
                <View style={styles.photoRow}>
                  {rowPhotos.map(photo => (
                    <PhotoThumbnail key={photo.id} photo={photo} onPress={setSelectedImage} />
                  ))}
                </View>
              );
            }}
            contentContainerStyle={styles.tripGallery}
            stickySectionHeadersEnabled={false}
          />

          {/* Location Edit Modal */}
          <Modal
            visible={showLocationEditModal}
            animationType="slide"
            presentationStyle="pageSheet"
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setShowLocationEditModal(false);
                    setEditingDayPhotos(null);
                    setSelectedEditLocation(null);
                  }}
                >
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Set Location</Text>
                <TouchableOpacity
                  onPress={handleLocationUpdate}
                  disabled={!selectedEditLocation}
                >
                  <Text style={[
                    styles.modalDone,
                    !selectedEditLocation && styles.modalDoneDisabled
                  ]}>Done</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <Text style={styles.modalSubtitle}>
                  Setting location for {editingDayPhotos?.length || 0} photos
                </Text>

                <View style={styles.searchInputContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search for a location..."
                    placeholderTextColor="#999"
                    value={locationSearchQuery}
                    onChangeText={(text) => {
                      setLocationSearchQuery(text);
                      searchLocations(text);
                    }}
                    autoFocus
                  />
                  {searchingLocation && (
                    <ActivityIndicator size="small" color="#007AFF" style={styles.searchSpinner} />
                  )}
                </View>

                {selectedEditLocation && (
                  <View style={styles.selectedLocationBox}>
                    <Text style={styles.selectedLocationLabel}>Selected:</Text>
                    <Text style={styles.selectedLocationText} numberOfLines={2}>
                      {selectedEditLocation.displayName}
                    </Text>
                  </View>
                )}

                <FlatList
                  data={locationSearchResults}
                  keyExtractor={(item, index) => `${item.latitude}-${item.longitude}-${index}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.locationResultItem,
                        selectedEditLocation?.latitude === item.latitude &&
                        selectedEditLocation?.longitude === item.longitude &&
                        styles.locationResultItemSelected
                      ]}
                      onPress={() => setSelectedEditLocation(item)}
                    >
                      <Text style={styles.locationResultText} numberOfLines={2}>
                        {item.displayName}
                      </Text>
                      {selectedEditLocation?.latitude === item.latitude &&
                       selectedEditLocation?.longitude === item.longitude && (
                        <Text style={styles.locationResultCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  style={styles.locationResultsList}
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            </SafeAreaView>
          </Modal>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Year detail view - show clusters for a specific year
  if (selectedYear) {
    return (
      <YearDetailView
        year={selectedYear}
        clusters={clusters}
        photosWithFaces={photosWithFaces}
        onBack={() => setSelectedYear(null)}
        onViewCluster={handleViewAll}
      />
    );
  }

  if (loading && !cacheLoaded) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" />
        <Image
          source={require('./assets/vacation-splash.png')}
          style={styles.splashImage}
          resizeMode="cover"
        />
        <View style={styles.splashOverlay}>
          <View style={styles.loadingBox}>
            {recentPhotos.length > 0 && (
              <View style={styles.loadingPhotosRow}>
                {recentPhotos.map((photo, index) => (
                  <Image
                    key={photo.id}
                    source={{ uri: photo.uri }}
                    style={[styles.loadingPhotoThumb, { opacity: 0.7 + (index * 0.1) }]}
                  />
                ))}
              </View>
            )}
            <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: recentPhotos.length > 0 ? 12 : 0 }} />
            <Text style={styles.splashLoadingText}>{loadingProgress}</Text>
            {loadingPercent > 0 && (
              <>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBarFill, { width: `${loadingPercent}%` }]} />
                </View>
                <Text style={styles.progressPercent}>{loadingPercent}%</Text>
              </>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Error state (only show if no cached data)
  if (error && clusters.length === 0) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.centerContainer} edges={['top', 'bottom']}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{error.message}</Text>
          <Text style={styles.errorDetails}>{error.details}</Text>
          <TouchableOpacity style={styles.button} onPress={error.retry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="auto" />
        <View style={styles.header}>
          <Image
            source={require('./assets/app-logo-transparent.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Vacation Photos</Text>
            <Text style={styles.headerSubtitle}>
              {clusters.length} trips · {photos.length} photos
            </Text>
          </View>
          {DEBUG_MODE && (
            <TouchableOpacity
              onPress={handleClearCache}
              style={styles.debugButton}
            >
              <Text style={styles.debugButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          key="clusters-list"
          data={getGroupedClusterItems()}
          renderItem={renderCluster}
          keyExtractor={(item) => item.id}
          extraData={photosWithFaces}
          contentContainerStyle={styles.clusterList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          }
          ListEmptyComponent={
            !loading && !refreshing ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🏖️</Text>
                <Text style={styles.emptyTitle}>No Vacation Photos Yet</Text>
                <Text style={styles.emptyMessage}>
                  We couldn't find any photos taken more than {MILES_FROM_HOME} miles from your current location.
                </Text>
                <Text style={styles.emptyHint}>
                  Try taking some photos on your next trip, or pull down to refresh.
                </Text>
                <TouchableOpacity style={styles.button} onPress={onRefresh}>
                  <Text style={styles.buttonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListFooterComponent={
            hasMore ? (
              <View style={styles.footerContainer}>
                <TouchableOpacity
                  style={[styles.loadMoreButton, loadingMore && styles.loadMoreButtonDisabled]}
                  onPress={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.loadMoreText}>Load More Photos</Text>
                  )}
                </TouchableOpacity>
                {loadingMore && (
                  <Text style={styles.loadingMoreText}>{loadingProgress}</Text>
                )}
              </View>
            ) : (
              <Text style={styles.endText}>No more photos</Text>
            )
          }
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
