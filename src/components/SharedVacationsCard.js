import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/theme';

const PHOTO_SIZE = 36;
const SWIPE_THRESHOLD = 100;
const MAX_PREVIEW_PHOTOS = 3;

export default function SharedVacationsCard({
  pendingVacations = [],
  onPress,
  onDismiss,
}) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          Animated.timing(translateX, {
            toValue: 400,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onDismiss?.();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!pendingVacations || pendingVacations.length === 0) {
    return null;
  }

  // Derive loading and content state
  const { isAnyLoading, loadedVacations, allPhotos, senders } = deriveCardState(pendingVacations);

  // Determine how many photo slots to show (real photos + loading placeholders)
  const photoSlots = getPhotoSlots(allPhotos, isAnyLoading);

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Photo previews with loading placeholders */}
        <PhotoPreviews slots={photoSlots} />

        {/* Text content */}
        <View style={styles.textContent}>
          <Text style={styles.titleText}>
            {getSummaryText(pendingVacations, loadedVacations, senders)}
          </Text>
          <Text style={styles.subtitleText} numberOfLines={1}>
            {getLocationPreview(loadedVacations, isAnyLoading)}
          </Text>
        </View>

        {/* Chevron */}
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Swipe hint */}
      <View style={styles.swipeHint}>
        <View style={styles.swipeHintBar} />
      </View>
    </Animated.View>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Derive the card's state from pending vacations
 */
function deriveCardState(pendingVacations) {
  const isAnyLoading = pendingVacations.some(sv => sv.isLoading);
  const loadedVacations = pendingVacations.filter(sv => sv.vacation);

  const allPhotos = pendingVacations
    .flatMap(sv => sv.previewPhotos || [])
    .slice(0, MAX_PREVIEW_PHOTOS);

  const senders = [...new Set(
    loadedVacations.map(sv => sv.vacation?.sharedBy).filter(Boolean)
  )];

  return { isAnyLoading, loadedVacations, allPhotos, senders };
}

/**
 * Get photo slots (real photos + loading placeholders)
 */
function getPhotoSlots(allPhotos, isAnyLoading) {
  const slots = allPhotos.map(photo => ({ type: 'photo', photo }));

  // Add loading placeholders if we're loading and don't have enough photos
  if (isAnyLoading && slots.length < MAX_PREVIEW_PHOTOS) {
    const placeholdersNeeded = Math.min(MAX_PREVIEW_PHOTOS - slots.length, 1);
    for (let i = 0; i < placeholdersNeeded; i++) {
      slots.push({ type: 'loading' });
    }
  }

  return slots;
}

/**
 * Get summary text based on loading state and senders
 */
function getSummaryText(pendingVacations, loadedVacations, senders) {
  const totalCount = pendingVacations.length;
  const loadedCount = loadedVacations.length;
  const loadingCount = totalCount - loadedCount;

  // All still loading
  if (loadedCount === 0) {
    return loadingCount === 1
      ? 'Loading shared vacation...'
      : `Loading ${loadingCount} shared vacations...`;
  }

  // Some loaded, some loading
  if (loadingCount > 0) {
    const senderText = senders.length === 1 ? senders[0] : `${senders.length} friends`;
    return `${senderText} shared vacations (+${loadingCount} loading)`;
  }

  // All loaded
  if (senders.length === 0) return 'New shared vacations';
  if (senders.length === 1) {
    return totalCount === 1
      ? `${senders[0]} shared a vacation with you`
      : `${senders[0]} shared ${totalCount} vacations`;
  }
  return `${senders.length} friends shared vacations with you`;
}

/**
 * Get location preview text
 */
function getLocationPreview(loadedVacations, isAnyLoading) {
  const locations = loadedVacations
    .map(sv => sv.vacation?.locationName)
    .filter(Boolean)
    .slice(0, 2);

  if (locations.length === 0) {
    return isAnyLoading ? 'Fetching details...' : '';
  }
  if (locations.length === 1) return locations[0];
  if (loadedVacations.length > 2) {
    return `${locations[0]} and ${loadedVacations.length - 1} more`;
  }
  return locations.join(', ');
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Photo previews with loading placeholders
 */
function PhotoPreviews({ slots }) {
  if (slots.length === 0) return null;

  return (
    <View style={styles.photosContainer}>
      {slots.map((slot, index) => (
        <View
          key={index}
          style={[
            styles.photoWrapper,
            { marginLeft: index > 0 ? -10 : 0, zIndex: MAX_PREVIEW_PHOTOS - index },
          ]}
        >
          {slot.type === 'photo' ? (
            <Image
              source={{ uri: `file://${slot.photo.localPath}` }}
              style={styles.photo}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.medium,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  photosContainer: {
    flexDirection: 'row',
    marginRight: spacing.md,
  },
  photoWrapper: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
  },
  titleText: {
    ...typography.subhead,
    color: colors.text.primary,
    fontWeight: '600',
  },
  subtitleText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: colors.text.muted,
    marginLeft: spacing.sm,
  },
  swipeHint: {
    position: 'absolute',
    right: -8,
    top: '50%',
    marginTop: -10,
    width: 16,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeHintBar: {
    width: 4,
    height: 20,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
});
