import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/theme';

const PHOTO_SIZE = 56;

export default function SharedVacationsList({
  sharedVacations, // Array of { shareId, vacation, previewPhotos, receivedAt }
  onSelectVacation,
  onClose,
}) {
  const formatDate = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateRange = (start, end) => {
    if (!start || !end) return '';
    const options = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', options);
    const endStr = end.toLocaleDateString('en-US', options);
    if (startStr === endStr) return startStr;
    return `${startStr} - ${endStr}`;
  };

  const renderVacation = ({ item }) => {
    const { shareId, vacation, previewPhotos, receivedAt } = item;

    return (
      <TouchableOpacity
        style={styles.vacationCard}
        onPress={() => onSelectVacation(shareId)}
        activeOpacity={0.8}
      >
        {/* Photo previews */}
        <View style={styles.photosContainer}>
          {(previewPhotos || []).slice(0, 3).map((photo, index) => (
            <View
              key={index}
              style={[
                styles.photoWrapper,
                { marginLeft: index > 0 ? -12 : 0, zIndex: 3 - index },
              ]}
            >
              <Image
                source={{ uri: `file://${photo.localPath}` }}
                style={styles.photo}
              />
            </View>
          ))}
        </View>

        {/* Vacation details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.sharedByText}>
            From {vacation?.sharedBy || 'Someone'}
          </Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {vacation?.locationName || 'Vacation'}
          </Text>
          <Text style={styles.metaText}>
            {formatDateRange(vacation?.startDate, vacation?.endDate)}
            {vacation?.photoCount ? ` · ${vacation.photoCount} photos` : ''}
          </Text>
          {receivedAt && (
            <Text style={styles.receivedText}>
              Received {formatDate(receivedAt)}
            </Text>
          )}
        </View>

        {/* Chevron */}
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="auto" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Shared Vacations</Text>
          <Text style={styles.subtitle}>
            {sharedVacations.length} vacation{sharedVacations.length !== 1 ? 's' : ''} shared with you
          </Text>
        </View>

        {/* List */}
        <FlatList
          data={sharedVacations}
          renderItem={renderVacation}
          keyExtractor={(item) => item.shareId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No shared vacations</Text>
            </View>
          }
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
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
  list: {
    padding: spacing.lg,
  },
  vacationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.small,
  },
  photosContainer: {
    flexDirection: 'row',
    marginRight: spacing.md,
  },
  photoWrapper: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    flex: 1,
  },
  sharedByText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationText: {
    ...typography.headline,
    color: colors.text.primary,
  },
  metaText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  receivedText: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  chevron: {
    fontSize: 24,
    color: colors.text.muted,
    marginLeft: spacing.sm,
  },
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
});
