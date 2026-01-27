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
  Modal,
  TextInput,
  Animated,
  Alert,
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
import { getPendingShare, clearPendingShare } from './src/utils/appGroupStorage';
import {
  usePhotoLoading,
  useEditedLocations,
  useSharedVacations,
  useFaceDetection,
} from './src/hooks';

// Debug mode - set to false for production
const DEBUG_MODE = __DEV__;

// Mock data for testing App Clip handoff flow
const MOCK_APP_CLIP_CONTEXT = {
  shareId: 'test-share-debug-123',
  locationName: 'Hawaii Beach Trip',
  sharedBy: 'Sarah',
  photoCount: 12,
  thumbnails: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=400',
    'https://images.unsplash.com/photo-1476673160081-cf065607f449?w=400',
  ],
};

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

// Fullscreen photo component for the swipeable viewer
const FullscreenPhoto = memo(({ photo }) => {
  const [uri, setUri] = useState(() => uriCache.get(photo.id) || null);

  useEffect(() => {
    if (uri) return;

    const cached = uriCache.get(photo.id);
    if (cached) {
      setUri(cached);
      return;
    }

    MediaLibrary.getAssetInfoAsync(photo.id)
      .then((info) => {
        const photoUri = info.localUri || info.uri;
        if (photoUri) {
          uriCache.set(photo.id, photoUri);
          setUri(photoUri);
        }
      })
      .catch(() => {});
  }, [photo.id, uri]);

  return (
    <View style={{ width, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.fullImage}
          resizeMode="contain"
        />
      ) : (
        <ActivityIndicator size="large" color="#fff" />
      )}
    </View>
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
    pendingVacations,
    pastVacations,
    sharedVacationsDismissed,
    getUploadStatus,
    loadUploadedVacations,
    markVacationAsViewed,
    dismissSharedVacations: handleDismissSharedVacations,
  } = sharedVacationsHook;

  // ==========================================
  // UI STATE - Navigation and modals
  // ==========================================
  const [selectedImage, setSelectedImage] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(0);
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

  // App Clip handoff state
  const [pendingAppClipShare, setPendingAppClipShare] = useState(null);
  const [appClipContext, setAppClipContext] = useState(null); // Full context from App Clip
  const [showAppClipPrompt, setShowAppClipPrompt] = useState(false);

  // Debug menu state (DEV only)
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const debugTapCount = useRef(0);
  const debugTapTimer = useRef(null);

  // Animation refs for collapsible header
  const scrollY = useRef(new Animated.Value(0)).current;

  // Reset scroll position when cluster changes
  useEffect(() => {
    scrollY.setValue(0);
  }, [selectedCluster?.id]);

  // ==========================================
  // EFFECTS
  // ==========================================

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Check for pending share from App Clip (or debug context)
  useEffect(() => {
    const checkPendingShare = async () => {
      try {
        // First check for real App Clip context from App Groups
        const pending = await getPendingShare();
        if (pending && pending.shareId) {
          console.log('[App] Found pending share from App Clip:', pending.shareId);
          console.log('[App] Context:', pending.locationName, pending.sharedBy, pending.thumbnails?.length);
          setPendingAppClipShare(pending.shareId);
          // Store full context for contextual onboarding
          setAppClipContext(pending);
          // Note: Don't show shared vacation immediately if onboarding is needed
          // The contextual onboarding will handle the flow
          return;
        }

        // DEV only: Check for debug context in AsyncStorage
        if (DEBUG_MODE) {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const debugContext = await AsyncStorage.getItem('debug_app_clip_context');
          if (debugContext) {
            console.log('[App] Found DEBUG App Clip context');
            const parsed = JSON.parse(debugContext);
            setAppClipContext(parsed);
            // Clear it so it only triggers once
            await AsyncStorage.removeItem('debug_app_clip_context');
          }
        }
      } catch (error) {
        console.log('[App] Error checking pending share:', error);
      }
    };

    checkPendingShare();
  }, []);

  // Show shared vacation after onboarding completes (App Clip handoff)
  useEffect(() => {
    // Only trigger when onboarding is complete and we have a pending share
    if (showOnboarding === false && !showLocationSelection && pendingAppClipShare && hasPermission === true) {
      console.log('[App] Onboarding complete, showing shared vacation:', pendingAppClipShare);
      setSharedVacationId(pendingAppClipShare);
      setShowAppClipPrompt(true);
      // Clear so we don't show again
      setPendingAppClipShare(null);
      setAppClipContext(null);
    }
  }, [showOnboarding, showLocationSelection, pendingAppClipShare, hasPermission]);

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

  // Debug: Triple-tap handler to open debug menu (DEV only)
  const handleDebugTap = useCallback(() => {
    if (!DEBUG_MODE) return;

    debugTapCount.current += 1;

    if (debugTapTimer.current) {
      clearTimeout(debugTapTimer.current);
    }

    if (debugTapCount.current >= 3) {
      debugTapCount.current = 0;
      setShowDebugMenu(true);
    } else {
      debugTapTimer.current = setTimeout(() => {
        debugTapCount.current = 0;
      }, 500);
    }
  }, []);

  // Debug: Simulate App Clip handoff flow
  const handleDebugSimulateAppClip = useCallback(async () => {
    setShowDebugMenu(false);

    // Clear any existing onboarding state
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('onboarding_complete');

    // Set the mock App Clip context
    setAppClipContext(MOCK_APP_CLIP_CONTEXT);
    setPendingAppClipShare(null); // Will be set after onboarding

    // Reset to show onboarding
    photoLoading.resetOnboarding && photoLoading.resetOnboarding();

    // Force reload by setting showOnboarding directly via hook
    // We need to trigger a re-check of onboarding status
    Alert.alert(
      'Debug: App Clip Simulation',
      'App Clip context set. Please close the app completely and reopen to see the contextual onboarding flow.',
      [{ text: 'OK' }]
    );
  }, []);

  // Debug: Quick test - show shared vacation viewer directly
  const handleDebugShowViewer = useCallback(() => {
    setShowDebugMenu(false);
    setSharedVacationId(MOCK_APP_CLIP_CONTEXT.shareId);
    setShowAppClipPrompt(true);
  }, []);

  // Debug: Set App Clip context without restarting (for testing contextual onboarding)
  const handleDebugSetContext = useCallback(async () => {
    setShowDebugMenu(false);

    // Clear onboarding state
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('onboarding_complete');

    // Save mock context to AsyncStorage so it persists across restart
    await AsyncStorage.setItem('debug_app_clip_context', JSON.stringify(MOCK_APP_CLIP_CONTEXT));

    Alert.alert(
      'Debug: Context Set',
      'App Clip context is set. Close the app completely and reopen to see the contextual onboarding.',
      [{ text: 'OK' }]
    );
  }, []);

  // Handle card tap - open the list or viewer
  const handleSharedVacationsCardPress = useCallback(() => {
    if (pendingVacations.length === 1) {
      markVacationAsViewed(pendingVacations[0].shareId);
      setSharedVacationId(pendingVacations[0].shareId);
    } else {
      setShowSharedVacationsList(true);
    }
  }, [pendingVacations, markVacationAsViewed]);

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
    // Contextual onboarding when coming from App Clip
    if (appClipContext && appClipContext.shareId) {
      return (
        <SafeAreaProvider>
          <View style={styles.onboardingContainer}>
            <StatusBar style="light" />
            <Image
              source={require('./assets/vacation-splash.png')}
              style={styles.onboardingBackground}
              resizeMode="cover"
            />
            <View style={styles.appClipOnboardingOverlay}>
              <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                <View style={styles.appClipOnboardingContent}>
                  {/* Thumbnails from App Clip */}
                  {appClipContext.thumbnails && appClipContext.thumbnails.length > 0 && (
                    <View style={styles.appClipThumbnailsRow}>
                      {appClipContext.thumbnails.slice(0, 3).map((url, index) => (
                        <Image
                          key={index}
                          source={{ uri: url }}
                          style={styles.appClipThumbnail}
                          resizeMode="cover"
                        />
                      ))}
                    </View>
                  )}

                  {/* Location name */}
                  {appClipContext.locationName && (
                    <Text style={styles.appClipLocationText}>
                      {appClipContext.locationName}
                    </Text>
                  )}

                  {/* Contextual tagline */}
                  <Text style={styles.appClipTagline}>
                    <Text style={styles.appClipSharedByText}>{appClipContext.sharedBy || 'A friend'}</Text>
                    {' shared a vacation with you!'}
                  </Text>

                  <Text style={styles.appClipSubtext}>
                    Let's get you set up so you can view and save these photos.
                  </Text>

                  <TouchableOpacity
                    style={styles.onboardingButton}
                    onPress={async () => {
                      await clearPendingShare();
                      // Store shareId to show after onboarding
                      setPendingAppClipShare(appClipContext.shareId);
                      handleGetStarted();
                    }}
                  >
                    <Text style={styles.onboardingButtonText}>Get Started</Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </View>
          </View>
        </SafeAreaProvider>
      );
    }

    // Default onboarding (no App Clip context)
    return (
      <SafeAreaProvider>
        <View style={styles.onboardingContainer}>
          <StatusBar style="light" />
          <TouchableOpacity activeOpacity={1} onPress={handleDebugTap}>
            <Image
              source={require('./assets/vacation-splash.png')}
              style={styles.onboardingBackground}
              resizeMode="cover"
            />
          </TouchableOpacity>
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

          {/* Debug Menu (DEV only) - Triple-tap image to open */}
          {DEBUG_MODE && (
            <Modal
              visible={showDebugMenu}
              transparent
              animationType="fade"
              onRequestClose={() => setShowDebugMenu(false)}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                activeOpacity={1}
                onPress={() => setShowDebugMenu(false)}
              >
                <View style={{
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  padding: 24,
                  width: '85%',
                  maxWidth: 340,
                }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 4, textAlign: 'center' }}>
                    🛠 Debug Menu
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>
                    App Clip Handoff Testing
                  </Text>

                  <TouchableOpacity
                    style={{
                      backgroundColor: '#6366F1',
                      padding: 16,
                      borderRadius: 12,
                      marginBottom: 12,
                    }}
                    onPress={() => {
                      setShowDebugMenu(false);
                      // Directly set the mock context to show contextual onboarding
                      setAppClipContext(MOCK_APP_CLIP_CONTEXT);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                      Show App Clip Onboarding
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>
                      Instantly shows contextual onboarding with thumbnails
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: '#f0f0f0',
                      padding: 16,
                      borderRadius: 12,
                    }}
                    onPress={() => setShowDebugMenu(false)}
                  >
                    <Text style={{ color: '#333', fontWeight: '600', fontSize: 16, textAlign: 'center' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          )}
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
    const { photos: viewerPhotos, initialIndex, startDate } = selectedImage;
    const currentPhoto = viewerPhotos[viewerIndex] || viewerPhotos[0];

    // Calculate which day this photo is from
    let dayLabel = '';
    if (startDate && currentPhoto?.creationTime) {
      const photoDate = new Date(currentPhoto.creationTime);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      photoDate.setHours(0, 0, 0, 0);
      const dayNum = Math.floor((photoDate - start) / (1000 * 60 * 60 * 24)) + 1;
      if (dayNum > 0) {
        dayLabel = `Day ${dayNum}`;
      }
    }

    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <StatusBar style="light" />
          <FlatList
            data={viewerPhotos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
              setViewerIndex(newIndex);
            }}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <FullscreenPhoto photo={item} />
            )}
          />
          <SafeAreaView style={styles.viewerOverlay} edges={['top']} pointerEvents="box-none">
            <View style={styles.viewerTopBar}>
              <Text style={styles.viewerDayLabel}>{dayLabel}</Text>
              <TouchableOpacity onPress={() => setSelectedImage(null)}>
                <Text style={styles.viewerCloseButton}>Done</Text>
              </TouchableOpacity>
              <Text style={styles.viewerCounter}>{viewerIndex + 1} / {viewerPhotos.length}</Text>
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    );
  }

  // Shared vacations list - show all shared vacations
  if (showSharedVacationsList) {
    return (
      <SharedVacationsList
        pendingVacations={pendingVacations}
        pastVacations={pastVacations}
        onSelectVacation={handleSelectSharedVacation}
        onMarkAsViewed={markVacationAsViewed}
        onClose={() => setShowSharedVacationsList(false)}
      />
    );
  }

  // Shared vacation viewer - show photos shared via deep link
  if (sharedVacationId) {
    // Check if we're in App Clip handoff mode (scanning in background)
    const isAppClipMode = showAppClipPrompt && loading;
    const scanningComplete = showAppClipPrompt && !loading && clusters.length > 0;

    return (
      <SharedVacationViewer
        shareId={sharedVacationId}
        onClose={() => {
          setSharedVacationId(null);
          setShowAppClipPrompt(false);
        }}
        // Pass scanning progress for App Clip handoff
        scanningProgress={isAppClipMode ? {
          current: 0,
          total: 100,
          percent: loadingPercent || 0,
        } : null}
        scanningComplete={scanningComplete}
        vacationsFound={clusters.length}
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

    // Animation values for collapsible header
    const HEADER_MAX_HEIGHT = 280;
    const HEADER_MIN_HEIGHT = 56;
    const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

    const headerHeight = scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE],
      outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
      extrapolate: 'clamp',
    });

    const headerContentOpacity = scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE / 2],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    const compactHeaderOpacity = scrollY.interpolate({
      inputRange: [HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <StatusBar style="auto" />

          {/* Animated Header */}
          <Animated.View style={[styles.tripHeaderAnimated, { height: headerHeight }]}>
            {/* Compact header - shows when scrolled */}
            <Animated.View style={[styles.compactHeader, { opacity: compactHeaderOpacity }]}>
              <TouchableOpacity onPress={() => setSelectedCluster(null)} style={styles.compactBackButton}>
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.compactTitle} numberOfLines={1}>{locationCity}</Text>
              <TouchableOpacity onPress={() => setShowDetailShareModal(true)} style={styles.compactShareButton}>
                <Ionicons name="arrow-redo" size={20} color={colors.primary} />
              </TouchableOpacity>
            </Animated.View>

            {/* Full header - shows when at top */}
            <Animated.View style={[styles.fullHeaderContent, { opacity: headerContentOpacity }]}>
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
            </Animated.View>
          </Animated.View>

          <Animated.SectionList
            sections={photosByDay}
            keyExtractor={(item) => item.id}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
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
                  {rowPhotos.map((photo, rowIndex) => {
                    const photoIndex = selectedCluster.photos.findIndex(p => p.id === photo.id);
                    return (
                      <PhotoThumbnail
                        key={photo.id}
                        photo={photo}
                        onPress={() => {
                          const idx = photoIndex >= 0 ? photoIndex : 0;
                          setViewerIndex(idx);
                          setSelectedImage({
                            photos: selectedCluster.photos,
                            initialIndex: idx,
                            startDate: selectedCluster.startDate,
                          });
                        }}
                      />
                    );
                  })}
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
            <Text style={styles.splashLoadingText}>
              {loadingProgress}{loadingPercent > 0 ? ` · ${loadingPercent}%` : ''}
            </Text>
            {loadingPercent > 0 && (
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${loadingPercent}%` }]} />
              </View>
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
          <TouchableOpacity onPress={handleDebugTap} activeOpacity={1}>
            <Image
              source={require('./assets/app-logo-transparent.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Vacation Photos</Text>
            <Text style={styles.headerSubtitle}>
              {clusters.length} trips · {photos.length} photos
            </Text>
          </View>
          <View style={styles.headerRight}>
            {sharedVacations.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowSharedVacationsList(true)}
                style={styles.sharedVacationsButton}
              >
                <Ionicons name="people" size={22} color={colors.primary} />
                {pendingVacations.length > 0 && (
                  <View style={styles.sharedBadge}>
                    <Text style={styles.sharedBadgeText}>{pendingVacations.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            {DEBUG_MODE && (
              <TouchableOpacity
                onPress={handleClearCache}
                style={styles.debugButton}
              >
                <Text style={styles.debugButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Shared Vacations Card */}
        {pendingVacations.length > 0 && !sharedVacationsDismissed && (
          <SharedVacationsCard
            pendingVacations={pendingVacations}
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

        {/* Debug Menu (DEV only) - Triple-tap logo to open */}
        {DEBUG_MODE && (
          <Modal
            visible={showDebugMenu}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDebugMenu(false)}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              activeOpacity={1}
              onPress={() => setShowDebugMenu(false)}
            >
              <View style={{
                backgroundColor: '#fff',
                borderRadius: 16,
                padding: 24,
                width: '85%',
                maxWidth: 340,
              }}>
                <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 4, textAlign: 'center' }}>
                  🛠 Debug Menu
                </Text>
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>
                  App Clip Handoff Testing
                </Text>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#6366F1',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                  onPress={handleDebugSetContext}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                    Set App Clip Context
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>
                    Sets mock context, restart app to see onboarding
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#6366F1',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                  onPress={handleDebugShowViewer}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                    Show Shared Vacation Viewer
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>
                    Opens viewer with scanning status bar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#f0f0f0',
                    padding: 16,
                    borderRadius: 12,
                  }}
                  onPress={() => setShowDebugMenu(false)}
                >
                  <Text style={{ color: '#333', fontWeight: '600', fontSize: 16, textAlign: 'center' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
