import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback, memo } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';

// Import reusable components and styles
import {
  Screen,
  LocationSelectionScreen,
  LocationSearchModal,
  YearDetailView,
  ClusterCard,
  YearCard,
  CollapsedClusterCard,
  CollagePhoto,
  formatDateRange,
  ShareModal,
} from './src/components';
import SharedVacationViewer from './src/components/SharedVacationViewer';
import SharedVacationsCard from './src/components/SharedVacationsCard';
import SharedVacationsList from './src/components/SharedVacationsList';

import styles, { imageSize } from './src/styles/appStyles';
import { colors } from './src/styles/theme';
import {
  saveCache,
  extractPhotoMetadata,
  extractClusterMetadata,
} from './src/utils/photoCache';
import {
  uriCache,
  geocodeClustersInParallel,
  groupPhotosByDay,
} from './src/utils/photoProcessing';
import {
  clusterPhotos,
  getDistanceKm,
  MILES_FROM_HOME,
} from './src/utils/clusteringUtils';
import { getLocationVibe } from './src/utils/vibeUtils';
import {
  usePhotoLoading,
  useEditedLocations,
  useSharedVacations,
  useFaceDetection,
} from './src/hooks';

// Debug mode - set to false for production
const DEBUG_MODE = __DEV__;

const { width } = Dimensions.get('window');

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
  // ==========================================
  // HOOKS - Business logic from custom hooks
  // ==========================================
  const photoLoading = usePhotoLoading();
  const editedLocationsHook = useEditedLocations();
  const sharedVacationsHook = useSharedVacations();
  const { photosWithFaces } = useFaceDetection(photoLoading.clusters, photoLoading.loading);

  // Destructure commonly used values from hooks
  const {
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
    loadPhotos,
    onRefresh,
    loadMore,
    initializeApp,
    handleGetStarted,
    handleLocationSelected: photoLoadingLocationSelected,
    handleClearCache,
    updateClusters,
    setPhotos,
    setClusters,
  } = photoLoading;

  const {
    editedLocations,
    saveEditedLocation,
    applyEditedLocations,
  } = editedLocationsHook;

  const {
    sharedVacations,
    sharedVacationsDismissed,
    getUploadStatus,
    loadUploadedVacations,
    dismissSharedVacations: handleDismissSharedVacations,
  } = sharedVacationsHook;

  // ==========================================
  // UI STATE - Navigation and modals
  // ==========================================
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [sharedVacationId, setSharedVacationId] = useState(null);
  const [showSharedVacationsList, setShowSharedVacationsList] = useState(false);
  const [showDetailShareModal, setShowDetailShareModal] = useState(false);
  const [showDetailLocationModal, setShowDetailLocationModal] = useState(false);

  // Location editing UI state
  const [editingDayPhotos, setEditingDayPhotos] = useState(null);
  const [showLocationEditModal, setShowLocationEditModal] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);
  const [selectedEditLocation, setSelectedEditLocation] = useState(null);
  const [searchingLocation, setSearchingLocation] = useState(false);

  // ==========================================
  // EFFECTS
  // ==========================================

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Apply edited locations when they're loaded and clusters exist
  useEffect(() => {
    if (Object.keys(editedLocations).length > 0 && clusters.length > 0) {
      const updatedClusters = applyEditedLocations(clusters);
      const hasChanges = updatedClusters.some((c, i) =>
        c.locationName !== clusters[i].locationName
      );
      if (hasChanges) {
        updateClusters(updatedClusters);
      }
    }
  }, [editedLocations, clusters, applyEditedLocations, updateClusters]);

  // ==========================================
  // HANDLERS
  // ==========================================

  // Wrap location selection to call initializeApp
  const handleLocationSelected = useCallback((location) => {
    photoLoadingLocationSelected(location, initializeApp);
  }, [photoLoadingLocationSelected, initializeApp]);

  // Handle card tap - open the list or viewer
  const handleSharedVacationsCardPress = useCallback(() => {
    if (sharedVacations.length === 1) {
      setSharedVacationId(sharedVacations[0].shareId);
    } else {
      setShowSharedVacationsList(true);
    }
  }, [sharedVacations]);

  // Handle selecting a vacation from the list
  const handleSelectSharedVacation = useCallback((shareId) => {
    setShowSharedVacationsList(false);
    setSharedVacationId(shareId);
  }, []);

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

  const handleViewAll = useCallback((cluster) => {
    setSelectedCluster(cluster);
  }, []);

  // Handle location edit from ClusterCard
  const handleLocationEdit = useCallback((clusterId, locationName, location) => {
    // Save the edited location
    saveEditedLocation(clusterId, locationName, location);

    // Update the cluster in state immediately
    setClusters(prevClusters => prevClusters.map(cluster => {
      if (cluster.id === clusterId) {
        return {
          ...cluster,
          locationName,
          location: location || cluster.location,
        };
      }
      return cluster;
    }));
  }, []);

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
        uploadStatus={getUploadStatus(item)}
        onShareComplete={loadUploadedVacations}
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

  // Shared vacations list - show all shared vacations
  if (showSharedVacationsList) {
    return (
      <SharedVacationsList
        sharedVacations={sharedVacations}
        onSelectVacation={handleSelectSharedVacation}
        onClose={() => setShowSharedVacationsList(false)}
      />
    );
  }

  // Shared vacation viewer - show photos shared via deep link
  if (sharedVacationId) {
    return (
      <SharedVacationViewer
        shareId={sharedVacationId}
        onClose={() => setSharedVacationId(null)}
      />
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
              {/* Action buttons */}
              <View style={styles.tripActionButtons}>
                <TouchableOpacity
                  style={styles.tripActionButton}
                  onPress={() => setShowDetailLocationModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location-outline" size={16} color={colors.text.secondary} />
                  <Text style={styles.tripActionButtonText}>Edit Location</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.tripActionButton}
                  onPress={() => setShowDetailShareModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-redo" size={16} color={colors.primary} />
                  <Text style={[styles.tripActionButtonText, { color: colors.primary }]}>Share</Text>
                </TouchableOpacity>
              </View>
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

          {/* Share Modal for detail view */}
          <ShareModal
            visible={showDetailShareModal}
            onClose={() => setShowDetailShareModal(false)}
            cluster={selectedCluster}
            onShareComplete={loadUploadedVacations}
          />

          {/* Location Edit Modal for detail view */}
          <LocationSearchModal
            visible={showDetailLocationModal}
            onClose={() => setShowDetailLocationModal(false)}
            onLocationSelected={(location) => {
              handleLocationEdit(selectedCluster.id, location.displayName, {
                latitude: location.latitude,
                longitude: location.longitude,
              });
              // Update the selected cluster directly to reflect the change
              setSelectedCluster(prev => ({
                ...prev,
                locationName: location.displayName,
                location: { latitude: location.latitude, longitude: location.longitude },
              }));
            }}
            title="Edit Location"
            currentLocation={selectedCluster?.locationName || ''}
          />
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

        {/* Shared Vacations Card */}
        {sharedVacations.length > 0 && !sharedVacationsDismissed && (
          <SharedVacationsCard
            sharedVacations={sharedVacations}
            onPress={handleSharedVacationsCardPress}
            onDismiss={handleDismissSharedVacations}
          />
        )}

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
