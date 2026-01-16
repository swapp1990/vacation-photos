import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
} from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/theme';

const PHOTO_SIZE = 36;
const SWIPE_THRESHOLD = 100;

export default function SharedVacationsCard({
  sharedVacations, // Array of { vacation, previewPhotos }
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

  if (!sharedVacations || sharedVacations.length === 0) {
    return null;
  }

  // Get unique senders
  const senders = [...new Set(sharedVacations.map(sv => sv.vacation?.sharedBy).filter(Boolean))];
  const senderCount = senders.length;

  // Get all preview photos (up to 3)
  const allPhotos = sharedVacations
    .flatMap(sv => sv.previewPhotos || [])
    .slice(0, 3);

  // Get summary text
  const getSummaryText = () => {
    if (senderCount === 0) return 'New shared vacations';
    if (senderCount === 1) {
      const count = sharedVacations.length;
      if (count === 1) {
        return `${senders[0]} shared a vacation with you`;
      }
      return `${senders[0]} shared ${count} vacations`;
    }
    return `${senderCount} friends shared vacations with you`;
  };

  // Get location preview
  const getLocationPreview = () => {
    const locations = sharedVacations
      .map(sv => sv.vacation?.locationName)
      .filter(Boolean)
      .slice(0, 2);
    if (locations.length === 0) return '';
    if (locations.length === 1) return locations[0];
    if (sharedVacations.length > 2) {
      return `${locations[0]} and ${sharedVacations.length - 1} more`;
    }
    return locations.join(', ');
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateX }] },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Photo previews */}
        {allPhotos.length > 0 && (
          <View style={styles.photosContainer}>
            {allPhotos.map((photo, index) => (
              <View
                key={index}
                style={[
                  styles.photoWrapper,
                  { marginLeft: index > 0 ? -10 : 0, zIndex: 3 - index },
                ]}
              >
                <Image
                  source={{ uri: `file://${photo.localPath}` }}
                  style={styles.photo}
                />
              </View>
            ))}
          </View>
        )}

        {/* Text content */}
        <View style={styles.textContent}>
          <Text style={styles.titleText}>{getSummaryText()}</Text>
          <Text style={styles.subtitleText} numberOfLines={1}>
            {getLocationPreview()}
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
