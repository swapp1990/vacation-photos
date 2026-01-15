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

export default function SharedVacationViewer({ shareId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vacation, setVacation] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ completed: 0, total: 0 });

  useEffect(() => {
    loadSharedVacation();
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

  const handleSavePhoto = async (photo) => {
    const result = await savePhotoToDevice(photo.localPath);

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

    const result = await saveAllPhotosToDevice(photos, (completed, total) => {
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
      <SafeAreaProvider>
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
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => handleSavePhoto(selectedPhoto)}
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
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Shared Vacation</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading shared photos...</Text>
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
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
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
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{vacation?.locationName || 'Shared Vacation'}</Text>
          {vacation && (
            <Text style={styles.subtitle}>
              {formatDate(vacation.startDate)} - {formatDate(vacation.endDate)}
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
    justifyContent: 'flex-end',
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
});
