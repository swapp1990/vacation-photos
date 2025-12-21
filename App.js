import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';

// Import reusable components and styles
import { Screen } from './src/components';
import styles, { imageSize } from './src/styles/appStyles';
import {
  loadCache,
  saveCache,
  extractPhotoMetadata,
  extractClusterMetadata,
  rebuildClusters,
} from './src/utils/photoCache';

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

function clusterPhotos(photosWithMeta) {
  if (photosWithMeta.length === 0) return [];

  // Cluster by location only (within 30 miles = same location)
  const clusters = [];
  let unknownLocationCluster = null;

  for (const photo of photosWithMeta) {
    const photoDate = new Date(photo.creationTime);

    // Photos without location go to a separate cluster
    if (!photo.location) {
      if (!unknownLocationCluster) {
        unknownLocationCluster = {
          id: 'cluster-unknown',
          photos: [photo],
          startDate: photoDate,
          endDate: photoDate,
          location: null,
          locationName: 'Unknown Location',
        };
      } else {
        unknownLocationCluster.photos.push(photo);
        if (photoDate < unknownLocationCluster.startDate) unknownLocationCluster.startDate = photoDate;
        if (photoDate > unknownLocationCluster.endDate) unknownLocationCluster.endDate = photoDate;
      }
      continue;
    }

    // Find existing cluster within 30 miles
    let foundCluster = null;
    for (const cluster of clusters) {
      if (cluster.location) {
        const distance = getDistanceKm(
          photo.location.latitude,
          photo.location.longitude,
          cluster.location.latitude,
          cluster.location.longitude
        );
        if (distance <= 48) { // ~30 miles
          foundCluster = cluster;
          break;
        }
      }
    }

    if (foundCluster) {
      foundCluster.photos.push(photo);
      if (photoDate < foundCluster.startDate) foundCluster.startDate = photoDate;
      if (photoDate > foundCluster.endDate) foundCluster.endDate = photoDate;
    } else {
      clusters.push({
        id: `cluster-${clusters.length}`,
        photos: [photo],
        startDate: photoDate,
        endDate: photoDate,
        location: photo.location,
        locationName: null,
      });
    }
  }

  // Add unknown location cluster if it exists
  if (unknownLocationCluster) {
    clusters.push(unknownLocationCluster);
  }

  // Sort photos within each cluster by date
  for (const cluster of clusters) {
    cluster.photos.sort((a, b) => new Date(a.creationTime) - new Date(b.creationTime));
    const days = Math.ceil((cluster.endDate - cluster.startDate) / (1000 * 60 * 60 * 24)) + 1;
    cluster.isVacation = cluster.photos.length >= 3;
    cluster.days = days;
  }

  // Sort clusters by most recent first
  clusters.sort((a, b) => b.endDate - a.endDate);

  return clusters;
}

function formatDateRange(start, end) {
  const options = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', options);
  const year = start.getFullYear();

  if (startStr === endStr) {
    return `${startStr}, ${year}`;
  }
  return `${startStr} - ${endStr}, ${year}`;
}

function PhotoThumbnail({ photo, onPress, size = imageSize }) {
  const [uri, setUri] = useState(null);

  useEffect(() => {
    let mounted = true;
    MediaLibrary.getAssetInfoAsync(photo.id).then((info) => {
      if (mounted) {
        setUri(info.localUri || info.uri);
      }
    });
    return () => {
      mounted = false;
    };
  }, [photo.id]);

  if (!uri) {
    return <View style={[styles.thumbnail, { width: size, height: size }]} />;
  }

  return (
    <TouchableOpacity onPress={() => onPress(uri)}>
      <Image source={{ uri }} style={[styles.thumbnail, { width: size, height: size }]} />
    </TouchableOpacity>
  );
}

function ClusterCard({ cluster, onPhotoPress, onViewAll }) {
  const previewPhotos = cluster.photos.slice(0, 4);
  const remaining = cluster.photos.length - 4;

  return (
    <View style={styles.clusterCard}>
      <View style={styles.clusterHeader}>
        <View>
          <View style={styles.clusterTitleRow}>
            {cluster.isVacation && <Text style={styles.vacationBadge}>Trip</Text>}
            <Text style={styles.clusterTitle}>
              {cluster.photos.length} photos
            </Text>
          </View>
          <Text style={styles.clusterDate}>
            {formatDateRange(cluster.startDate, cluster.endDate)}
            {cluster.days > 1 ? ` · ${cluster.days} days` : ''}
          </Text>
          {(cluster.locationName || cluster.location) && (
            <Text style={styles.clusterLocation}>
              📍 {cluster.locationName ||
                `${Number(cluster.location.latitude).toFixed(2)}°, ${Number(cluster.location.longitude).toFixed(2)}°`}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => onViewAll(cluster)} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.clusterPreview}>
        {previewPhotos.map((photo, index) => (
          <View key={photo.id} style={styles.previewContainer}>
            <PhotoThumbnail
              photo={photo}
              onPress={onPhotoPress}
              size={(width - 48) / 4 - 4}
            />
            {index === 3 && remaining > 0 && (
              <View style={styles.remainingOverlay}>
                <Text style={styles.remainingText}>+{remaining}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [hasPermission, setHasPermission] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [endCursor, setEndCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [homeLocation, setHomeLocation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newestPhotoTime, setNewestPhotoTime] = useState(null);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
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
    requestPermissions(cached);
  };

  const requestPermissions = async (cached) => {
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    let home = homeLocation;
    if (locationStatus === 'granted' && !home) {
      setLoadingProgress('Getting your location...');
      const location = await Location.getCurrentPositionAsync({});
      home = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setHomeLocation(home);
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
    }
    setLoadingProgress(isRefresh ? 'Checking for new photos...' : 'Fetching photos...');

    try {

    const queryOptions = {
      mediaType: 'photo',
      first: isRefresh ? 500 : 1000, // Smaller batch for refresh
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

    for (const asset of assetsToProcess) {
      processedCount++;
      try {
        const info = await MediaLibrary.getAssetInfoAsync(asset.id);

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
      } catch (e) {
        console.log('Error processing photo:', e.message);
      }
      if (!isRefresh && vacationPhotos.length >= 200) break;
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

    // Only geocode clusters that don't have location names yet
    setLoadingProgress('Getting location names...');
    for (const cluster of clustered) {
      if (cluster.location && cluster.location.latitude != null && !cluster.locationName) {
        try {
          const results = await Location.reverseGeocodeAsync({
            latitude: Number(cluster.location.latitude),
            longitude: Number(cluster.location.longitude),
          });
          console.log('Geocode results:', JSON.stringify(results));
          if (results && results.length > 0) {
            const place = results[0];
            const name = place.city || place.district || place.subregion || place.name;
            const region = place.region || place.administrativeArea;
            const country = place.country || place.isoCountryCode;
            cluster.locationName = [name, region, country]
              .filter(Boolean)
              .join(', ');
            console.log('Location name:', cluster.locationName);
          }
        } catch (e) {
          console.log('Geocoding error:', e.message);
        }
      }
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

  const renderCluster = ({ item }) => (
    <ClusterCard
      cluster={item}
      onPhotoPress={setSelectedImage}
      onViewAll={handleViewAll}
    />
  );

  if (hasPermission === null) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.centerContainer} edges={['top', 'bottom']}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.message}>Requesting permission...</Text>
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

  if (selectedCluster) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <StatusBar style="auto" />
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelectedCluster(null)}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {selectedCluster.locationName || 'Trip'}
            </Text>
            <Text style={styles.subtitle}>
              {formatDateRange(selectedCluster.startDate, selectedCluster.endDate)}
              {' · '}{selectedCluster.photos.length} photos
            </Text>
          </View>
          <FlatList
            key="cluster-grid"
            data={selectedCluster.photos}
            renderItem={({ item }) => (
              <PhotoThumbnail photo={item} onPress={setSelectedImage} />
            )}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.gallery}
          />
        </SafeAreaView>
      </SafeAreaProvider>
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
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.splashLoadingText}>{loadingProgress}</Text>
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
          <Text style={styles.subtitle}>
            {clusters.length} trips · {photos.length} photos ({MILES_FROM_HOME}+ miles from home)
          </Text>
        </View>
        <FlatList
          key="clusters-list"
          data={clusters}
          renderItem={renderCluster}
          keyExtractor={(item) => item.id}
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
