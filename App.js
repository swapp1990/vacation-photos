import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';

const MILES_FROM_HOME = 50;
const KM_FROM_HOME = MILES_FROM_HOME * 1.60934;

const { width } = Dimensions.get('window');
const imageSize = width / 3 - 4;

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

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    let home = null;
    if (locationStatus === 'granted') {
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
    if (mediaStatus === 'granted' && locationStatus === 'granted' && home) {
      loadPhotos(false, home);
    }
  };

  const loadPhotos = async (isLoadMore = false, home = homeLocation) => {
    if (!home) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setLoadingProgress('Fetching photos...');

    const queryOptions = {
      mediaType: 'photo',
      first: 1000,
      sortBy: ['creationTime'],
    };

    if (isLoadMore && endCursor) {
      queryOptions.after = endCursor;
    }

    const result = await MediaLibrary.getAssetsAsync(queryOptions);
    const { assets, endCursor: newCursor, hasNextPage } = result;

    setEndCursor(newCursor);
    setHasMore(hasNextPage);

    setLoadingProgress('Finding vacation photos...');
    const vacationPhotos = [];
    let noLocationCount = 0;
    let tooCloseCount = 0;
    let processedCount = 0;

    for (const asset of assets) {
      processedCount++;
      try {
        const info = await MediaLibrary.getAssetInfoAsync(asset.id);

        // Include photos without location in a separate group
        if (!info.location || info.location.latitude == null) {
          noLocationCount++;
          vacationPhotos.push({
            ...asset,
            location: null,
            localUri: info.localUri,
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
          localUri: info.localUri,
          distanceFromHome,
        });
      } catch (e) {
        console.log('Error processing photo:', e.message);
      }
      if (vacationPhotos.length >= 200) break;
    }

    console.log(`Processed: ${processedCount}, No location: ${noLocationCount}, Too close (<${MILES_FROM_HOME}mi): ${tooCloseCount}, Vacation photos: ${vacationPhotos.length}`);

    const allPhotos = isLoadMore ? [...photos, ...vacationPhotos] : vacationPhotos;
    setPhotos(allPhotos);

    setLoadingProgress('Clustering vacations...');
    const clustered = clusterPhotos(allPhotos);

    setLoadingProgress('Getting location names...');
    for (const cluster of clustered) {
      if (cluster.location && cluster.location.latitude != null) {
        try {
          const results = await Location.reverseGeocodeAsync({
            latitude: Number(cluster.location.latitude),
            longitude: Number(cluster.location.longitude),
          });
          console.log('Geocode results:', JSON.stringify(results));
          if (results && results.length > 0) {
            const place = results[0];
            // Try multiple fields for location name
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

    if (isLoadMore) {
      setLoadingMore(false);
    } else {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadPhotos(true);
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
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.centerContainer} edges={['top', 'bottom']}>
          <Text style={styles.message}>No access to photos or location</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermissions}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (selectedImage) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.fullscreenContainer} edges={['top', 'bottom']}>
          <StatusBar style="light" />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
          >
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: selectedImage }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </SafeAreaView>
      </SafeAreaProvider>
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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="auto" />
        <View style={styles.header}>
          <Text style={styles.title}>Vacation Photos</Text>
          <Text style={styles.subtitle}>
            {clusters.length} trips · {photos.length} photos ({MILES_FROM_HOME}+ miles from home)
          </Text>
        </View>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.message}>{loadingProgress}</Text>
          </View>
        ) : (
          <FlatList
            key="clusters-list"
            data={clusters}
            renderItem={renderCluster}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.clusterList}
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
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 8,
  },
  gallery: {
    padding: 2,
  },
  clusterList: {
    padding: 12,
  },
  clusterCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clusterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clusterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clusterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  vacationBadge: {
    backgroundColor: '#34C759',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
    overflow: 'hidden',
  },
  clusterDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  clusterLocation: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  viewAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  clusterPreview: {
    flexDirection: 'row',
  },
  previewContainer: {
    position: 'relative',
    marginRight: 4,
  },
  remainingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    margin: 2,
  },
  remainingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  thumbnail: {
    width: imageSize,
    height: imageSize,
    margin: 2,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  fullImage: {
    flex: 1,
    width: '100%',
  },
  footerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loadMoreButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    minWidth: 180,
  },
  loadMoreButtonDisabled: {
    backgroundColor: '#5AC8FA',
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingMoreText: {
    color: '#666',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  endText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginVertical: 20,
  },
});
