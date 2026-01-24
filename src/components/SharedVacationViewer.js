import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/theme';
import { downloadSharedVacation, savePhotoToDevice, saveAllPhotosToDevice } from '../services/photoDownloadService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const PHOTO_SIZE = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

export default function SharedVacationViewer({
  shareId,
  onClose,
  // Optional props for background scanning status (App Clip handoff)
  scanningProgress = null, // { current, total, percent } or null
  scanningComplete = false,
  vacationsFound = 0,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vacation, setVacation] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [currentViewerIndex, setCurrentViewerIndex] = useState(0);
  const [savingAll, setSavingAll] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ completed: 0, total: 0 });
  const [showReadyBanner, setShowReadyBanner] = useState(false);

  // Show ready banner when scanning completes
  useEffect(() => {
    if (scanningComplete && vacationsFound > 0 && !showReadyBanner) {
      setShowReadyBanner(true);
    }
  }, [scanningComplete, vacationsFound]);

  useEffect(() => {
    loadSharedVacation();
  }, [shareId]);

  const loadSharedVacation = async () => {
    setLoading(true);
    setError(null);

    // Debug mode: use mock data for test shareIds
    if (shareId && shareId.startsWith('test-share-debug')) {
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 500));

      setVacation({
        shareId,
        locationName: 'Hawaii Beach Trip',
        startDate: new Date('2024-12-15'),
        endDate: new Date('2024-12-22'),
        photoCount: 3,
        sharedBy: 'Sarah',
      });

      // Use Unsplash placeholder images for mock photos
      setPhotos([
        { orderIndex: 0, localPath: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', width: 800, height: 600, isRemote: true },
        { orderIndex: 1, localPath: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800', width: 800, height: 600, isRemote: true },
        { orderIndex: 2, localPath: 'https://images.unsplash.com/photo-1476673160081-cf065607f449?w=800', width: 800, height: 600, isRemote: true },
      ]);

      setLoading(false);
      return;
    }

    const result = await downloadSharedVacation(shareId);

    if (result.success) {
      setVacation(result.vacation);
      setPhotos(result.photos);
    } else {
      setError(result.error || 'Failed to load shared vacation');
    }

    setLoading(false);
  };

  const handleSavePhoto = async (photo) => {
    const result = await savePhotoToDevice(photo, shareId);

    if (result.success) {
      Alert.alert('Saved', 'Photo saved to your library');
    } else {
      Alert.alert('Error', result.error || 'Failed to save photo');
    }
  };

  const handleSaveAll = async () => {
    if (photos.length === 0) return;

    setSavingAll(true);
    setSaveProgress({ completed: 0, total: photos.length });

    const result = await saveAllPhotosToDevice(photos, shareId, (completed, total) => {
      setSaveProgress({ completed, total });
    });

    setSavingAll(false);

    if (result.success) {
      Alert.alert('Saved', `All ${result.savedCount} photos saved to your library`);
    } else if (result.savedCount > 0) {
      Alert.alert(
        'Partially Saved',
        `${result.savedCount} photos saved, ${result.failedCount} failed`
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to save photos');
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderPhoto = ({ item, index }) => {
    // Handle both local files and remote URLs (for debug mode)
    const imageUri = item.isRemote ? item.localPath : `file://${item.localPath}`;

    return (
      <TouchableOpacity
        style={styles.photoItem}
        onPress={() => {
          setCurrentViewerIndex(index);
          setSelectedPhotoIndex(index);
        }}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: imageUri }}
          style={styles.photoThumbnail}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  const handleViewerScroll = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentViewerIndex(index);
  };

  const renderPhotoViewer = () => (
    <Modal
      visible={selectedPhotoIndex !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setSelectedPhotoIndex(null)}
    >
      <SafeAreaProvider>
        <View style={styles.viewerContainer}>
          <StatusBar style="light" />
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={selectedPhotoIndex || 0}
            getItemLayout={(data, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={handleViewerScroll}
            keyExtractor={(item) => `viewer-${item.orderIndex}`}
            renderItem={({ item }) => {
              const imageUri = item.isRemote ? item.localPath : `file://${item.localPath}`;
              return (
                <View style={{ width: SCREEN_WIDTH, height: '100%', justifyContent: 'center' }}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.fullImage}
                    resizeMode="contain"
                  />
                </View>
              );
            }}
          />
          <SafeAreaView style={styles.viewerOverlay} edges={['top', 'bottom']} pointerEvents="box-none">
            <View style={styles.viewerHeader} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.viewerCloseButton}
                onPress={() => setSelectedPhotoIndex(null)}
              >
                <Text style={styles.viewerCloseText}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.viewerCounter}>
                {(currentViewerIndex + 1)} / {photos.length}
              </Text>
            </View>
            <View style={styles.viewerFooter} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => handleSavePhoto(photos[currentViewerIndex])}
              >
                <Text style={styles.saveButtonText}>Save to Photos</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );

  const renderSavingOverlay = () => (
    <Modal visible={savingAll} transparent animationType="fade">
      <View style={styles.savingOverlay}>
        <View style={styles.savingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.savingText}>
            Saving photos... {saveProgress.completed}/{saveProgress.total}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: saveProgress.total > 0
                    ? `${(saveProgress.completed / saveProgress.total) * 100}%`
                    : '0%',
                },
              ]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <StatusBar style="auto" />
          <View style={styles.header}>
            <Text style={styles.title}>Shared Vacation</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading shared vacation...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (error) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <StatusBar style="auto" />
          <View style={styles.header}>
            <Text style={styles.title}>Shared Vacation</Text>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>!</Text>
            <Text style={styles.errorTitle}>Unable to Load</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadSharedVacation}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="auto" />

        <View style={styles.header}>
          <Text style={styles.title}>{vacation?.locationName || 'Shared Vacation'}</Text>
          {vacation && (
            <Text style={styles.subtitle}>
              Shared by {vacation.sharedBy} · {formatDate(vacation.startDate)} - {formatDate(vacation.endDate)}
            </Text>
          )}
          <TouchableOpacity
            style={styles.saveAllButton}
            onPress={handleSaveAll}
            disabled={photos.length === 0}
          >
            <Text style={styles.saveAllButtonText}>Save All ({photos.length})</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => `photo-${item.orderIndex}`}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.photoGrid}
          columnWrapperStyle={styles.photoRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No photos found</Text>
            </View>
          }
        />

        {renderPhotoViewer()}
        {renderSavingOverlay()}

        {/* Background scanning status bar */}
        {(scanningProgress || showReadyBanner) && (
          <View style={styles.scanningStatusBar}>
            {showReadyBanner ? (
              <View style={styles.scanningReadyContainer}>
                <View style={styles.scanningReadyContent}>
                  <Text style={styles.scanningReadyIcon}>✓</Text>
                  <Text style={styles.scanningReadyText}>
                    Found {vacationsFound} vacation{vacationsFound !== 1 ? 's' : ''} in your photos!
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.goToVacationsButton}
                  onPress={onClose}
                >
                  <Text style={styles.goToVacationsButtonText}>See My Vacations</Text>
                </TouchableOpacity>
              </View>
            ) : scanningProgress && (
              <View style={styles.scanningProgressContent}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.scanningProgressText}>
                  Finding your vacations... {scanningProgress.percent || 0}%
                </Text>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  backButtonText: {
    ...typography.body,
    color: colors.primary,
  },
  title: {
    ...typography.title,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.subhead,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  saveAllButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.round,
  },
  saveAllButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },

  // Photo Grid
  photoGrid: {
    padding: spacing.lg,
  },
  photoRow: {
    justifyContent: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  errorIcon: {
    fontSize: 48,
    color: colors.error,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.title2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
  },

  // Photo Viewer Modal
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  viewerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  viewerCloseButton: {
    padding: spacing.sm,
  },
  viewerCloseText: {
    ...typography.body,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  viewerCounter: {
    ...typography.body,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  viewerFooter: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.round,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },

  // Saving Overlay
  savingOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingBox: {
    backgroundColor: colors.surface,
    padding: spacing.xxl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    minWidth: 250,
    ...shadows.large,
  },
  savingText: {
    ...typography.body,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.round,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
  },

  // Background Scanning Status Bar
  scanningStatusBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: 40, // Account for home indicator
  },
  scanningProgressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningProgressText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  scanningReadyContainer: {
    alignItems: 'center',
  },
  scanningReadyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  scanningReadyIcon: {
    fontSize: 18,
    color: colors.success || '#34C759',
    marginRight: spacing.xs,
  },
  scanningReadyText: {
    ...typography.subhead,
    color: colors.success || '#34C759',
    fontWeight: '600',
  },
  goToVacationsButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.round,
  },
  goToVacationsButtonText: {
    ...typography.button,
    color: colors.text.inverse,
    fontWeight: '600',
  },
});
