/**
 * Simplified Shared Vacation Viewer for App Clip
 *
 * This is a lightweight version that:
 * - Shows vacation photos in a grid
 * - No save functionality (install full app for that)
 * - Prominent "Get Full App" banner
 */
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
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { downloadSharedVacation } from '../src/services/photoDownloadService';
import { setAppGroupData } from '../src/utils/appGroupStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const SPACING = 16;
const PHOTO_SIZE = (SCREEN_WIDTH - SPACING * 2 - 8 * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// App Store URL for the full app
const APP_STORE_URL = 'https://apps.apple.com/app/id6756803475';

// Theme colors (inline to keep App Clip size minimal)
const colors = {
  primary: '#6366F1',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    inverse: '#FFFFFF',
  },
  border: '#E2E8F0',
  error: '#EF4444',
};

export default function SharedVacationClipViewer({ shareId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vacation, setVacation] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (shareId) {
      loadSharedVacation();
    }
  }, [shareId]);

  const loadSharedVacation = async () => {
    setLoading(true);
    setError(null);

    const result = await downloadSharedVacation(shareId);

    if (result.success) {
      setVacation(result.vacation);
      setPhotos(result.photos);
    } else {
      setError(result.error || 'Failed to load shared vacation');
    }

    setLoading(false);
  };

  const handleGetFullApp = async () => {
    // Save the shareId to App Group so full app can pick it up after install
    try {
      await setAppGroupData('pendingShareId', shareId);
      await setAppGroupData('pendingShareTimestamp', Date.now().toString());
    } catch (e) {
      console.log('Could not save to App Group:', e);
    }

    // Open App Store
    Linking.openURL(APP_STORE_URL);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderPhoto = ({ item }) => (
    <TouchableOpacity
      style={styles.photoItem}
      onPress={() => setSelectedPhoto(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: `file://${item.localPath}` }}
        style={styles.photoThumbnail}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  const renderPhotoViewer = () => (
    <Modal
      visible={selectedPhoto !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setSelectedPhoto(null)}
    >
      <View style={styles.viewerContainer}>
        <StatusBar style="light" />
        {selectedPhoto && (
          <Image
            source={{ uri: `file://${selectedPhoto.localPath}` }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        )}
        <SafeAreaView style={styles.viewerOverlay} edges={['top', 'bottom']}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity
              style={styles.viewerCloseButton}
              onPress={() => setSelectedPhoto(null)}
            >
              <Text style={styles.viewerCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.viewerFooter}>
            <Text style={styles.installPrompt}>Install the app to save photos</Text>
            <TouchableOpacity
              style={styles.getAppButton}
              onPress={handleGetFullApp}
            >
              <Text style={styles.getAppButtonText}>Get Full App</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );

  // No shareId provided
  if (!shareId) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <StatusBar style="auto" />
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>🔗</Text>
            <Text style={styles.errorTitle}>No Vacation Found</Text>
            <Text style={styles.errorMessage}>
              This link doesn't contain a valid vacation share.
            </Text>
            <TouchableOpacity style={styles.getAppButton} onPress={handleGetFullApp}>
              <Text style={styles.getAppButtonText}>Get Full App</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

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
            <Text style={styles.errorIcon}>⚠️</Text>
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="auto" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🌴</Text>
          <Text style={styles.title}>{vacation?.locationName || 'Shared Vacation'}</Text>
          {vacation && (
            <Text style={styles.subtitle}>
              {formatDate(vacation.startDate)} - {formatDate(vacation.endDate)} · {photos.length} photos
            </Text>
          )}
          {vacation?.sharedBy && (
            <Text style={styles.sharedBy}>Shared by {vacation.sharedBy}</Text>
          )}
        </View>

        {/* Photo Grid */}
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

        {/* Get Full App Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Want to save these photos?</Text>
            <Text style={styles.bannerSubtitle}>Get the full app to save and organize your vacation memories</Text>
          </View>
          <TouchableOpacity style={styles.bannerButton} onPress={handleGetFullApp}>
            <Text style={styles.bannerButtonText}>Get App</Text>
          </TouchableOpacity>
        </View>

        {renderPhotoViewer()}
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
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    marginTop: 4,
  },
  sharedBy: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 8,
    fontWeight: '500',
  },

  // Photo Grid
  photoGrid: {
    padding: SPACING,
    paddingBottom: 100, // Space for banner
  },
  photoRow: {
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
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
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 16,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
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
    justifyContent: 'flex-end',
    padding: 16,
  },
  viewerCloseButton: {
    padding: 8,
  },
  viewerCloseText: {
    fontSize: 16,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  viewerFooter: {
    padding: 24,
    alignItems: 'center',
  },
  installPrompt: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  getAppButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  getAppButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },

  // Get Full App Banner
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Account for home indicator
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  bannerContent: {
    flex: 1,
    marginRight: 16,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  bannerButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  bannerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
