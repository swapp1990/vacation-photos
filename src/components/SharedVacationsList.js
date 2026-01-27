import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/theme';

const PHOTO_SIZE = 56;

export default function SharedVacationsList({
  pendingVacations = [],
  pastVacations = [],
  onSelectVacation,
  onMarkAsViewed,
  onClose,
}) {
  const [showPastVacations, setShowPastVacations] = useState(false);

  const handleSelectVacation = (shareId) => {
    onMarkAsViewed?.(shareId);
    onSelectVacation(shareId);
  };

  // Count loading vs loaded vacations for subtitle
  const loadingCount = pendingVacations.filter(sv => sv.isLoading).length;
  const loadedCount = pendingVacations.length - loadingCount;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="auto" />

        {/* Header */}
        <Header
          pendingCount={pendingVacations.length}
          loadingCount={loadingCount}
          loadedCount={loadedCount}
          onClose={onClose}
        />

        {/* List */}
        <FlatList
          data={pendingVacations}
          renderItem={({ item }) => (
            <VacationCard
              vacation={item}
              isPast={false}
              onSelect={handleSelectVacation}
            />
          )}
          keyExtractor={(item) => item.shareId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            pastVacations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No shared vacations</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            <PastVacationsSection
              pastVacations={pastVacations}
              showPastVacations={showPastVacations}
              onToggle={() => setShowPastVacations(!showPastVacations)}
              onSelectVacation={handleSelectVacation}
            />
          }
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Header with back button and subtitle
 */
function Header({ pendingCount, loadingCount, loadedCount, onClose }) {
  const getSubtitle = () => {
    if (pendingCount === 0) return 'No new vacations';
    if (loadingCount > 0 && loadedCount === 0) {
      return `Loading ${loadingCount} vacation${loadingCount !== 1 ? 's' : ''}...`;
    }
    if (loadingCount > 0) {
      return `${loadedCount} new · ${loadingCount} loading`;
    }
    return `${pendingCount} new vacation${pendingCount !== 1 ? 's' : ''}`;
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onClose} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Shared Vacations</Text>
      <Text style={styles.subtitle}>{getSubtitle()}</Text>
    </View>
  );
}

/**
 * Individual vacation card with loading state support
 */
function VacationCard({ vacation, isPast, onSelect }) {
  const { shareId, vacation: vacationData, previewPhotos, receivedAt, isLoading, loadingPhase } = vacation;

  // Determine if this vacation is still loading
  const isLoadingMetadata = isLoading && loadingPhase === 'metadata';
  const isLoadingPhotos = isLoading && loadingPhase === 'photos';

  return (
    <TouchableOpacity
      style={[styles.vacationCard, isPast && styles.pastVacationCard]}
      onPress={() => onSelect(shareId)}
      activeOpacity={0.8}
    >
      {/* Photo previews or loading placeholder */}
      <PhotoPreviews
        photos={previewPhotos}
        isLoading={isLoadingMetadata || isLoadingPhotos}
      />

      {/* Vacation details */}
      <View style={styles.detailsContainer}>
        {isLoadingMetadata ? (
          <LoadingDetails />
        ) : (
          <VacationDetails
            vacation={vacationData}
            receivedAt={receivedAt}
            isLoadingPhotos={isLoadingPhotos}
          />
        )}
      </View>

      {/* Chevron */}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

/**
 * Photo previews with loading placeholder
 */
function PhotoPreviews({ photos, isLoading }) {
  const hasPhotos = photos && photos.length > 0;

  // Show loading placeholder if no photos and loading
  if (!hasPhotos && isLoading) {
    return (
      <View style={styles.photosContainer}>
        <View style={[styles.photoWrapper, styles.photoPlaceholder]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!hasPhotos) return null;

  return (
    <View style={styles.photosContainer}>
      {photos.slice(0, 3).map((photo, index) => (
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
  );
}

/**
 * Loading placeholder for vacation details
 */
function LoadingDetails() {
  return (
    <>
      <Text style={styles.sharedByText}>Loading...</Text>
      <Text style={[styles.locationText, styles.loadingText]}>
        Fetching vacation details
      </Text>
      <View style={styles.loadingBar}>
        <ActivityIndicator size="small" color={colors.text.muted} />
      </View>
    </>
  );
}

/**
 * Vacation details (sender, location, dates)
 */
function VacationDetails({ vacation, receivedAt, isLoadingPhotos }) {
  return (
    <>
      <Text style={styles.sharedByText}>
        From {vacation?.sharedBy || 'Someone'}
        {isLoadingPhotos && ' · Loading photos...'}
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
    </>
  );
}

/**
 * Collapsible past vacations section
 */
function PastVacationsSection({ pastVacations, showPastVacations, onToggle, onSelectVacation }) {
  if (pastVacations.length === 0) return null;

  return (
    <View style={styles.pastVacationsSection}>
      <TouchableOpacity style={styles.pastVacationsToggle} onPress={onToggle}>
        <Text style={styles.pastVacationsToggleText}>
          {showPastVacations ? '▼' : '▶'} See past vacations ({pastVacations.length})
        </Text>
      </TouchableOpacity>
      {showPastVacations && (
        <View style={styles.pastVacationsList}>
          {pastVacations.map((item) => (
            <VacationCard
              key={item.shareId}
              vacation={item}
              isPast={true}
              onSelect={onSelectVacation}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(date) {
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
}

function formatDateRange(start, end) {
  if (!start || !end) return '';
  const options = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', options);
  if (startStr === endStr) return startStr;
  return `${startStr} - ${endStr}`;
}

// =============================================================================
// Styles
// =============================================================================

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
  photoPlaceholder: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
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
  loadingText: {
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  loadingBar: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
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
  pastVacationsSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pastVacationsToggle: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  pastVacationsToggleText: {
    ...typography.subhead,
    color: colors.text.secondary,
  },
  pastVacationsList: {
    marginTop: spacing.sm,
  },
  pastVacationCard: {
    opacity: 0.7,
  },
});
