import { StyleSheet, Dimensions } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from './theme';

const { width } = Dimensions.get('window');
export const imageSize = width / 3 - 4;

export default StyleSheet.create({
  // Containers
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },

  // Splash Screen
  splashContainer: {
    flex: 1,
    backgroundColor: colors.splashBackground,
  },
  splashImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  splashOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxxl,
    borderRadius: borderRadius.xxl,
    alignItems: 'center',
    ...shadows.large,
  },
  splashLoadingText: {
    marginTop: spacing.md,
    ...typography.subhead,
    color: colors.text.primary,
  },
  loadingPhotosRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  loadingPhotoThumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    marginHorizontal: 8,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressPercent: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  detectedLocationText: {
    marginTop: spacing.sm,
    ...typography.caption,
    color: colors.text.secondary,
  },

  // Header - Clean & Compact
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    ...typography.title2,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2,
  },
  headerLogo: {
    width: 44,
    height: 44,
    marginRight: spacing.md,
    transform: [{ scale: 1.8 }],
  },
  title: {
    ...typography.largeTitle,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.subhead,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  backButton: {
    ...typography.body,
    color: colors.primary,
    marginBottom: spacing.sm,
  },

  // Gallery
  gallery: {
    padding: 2,
  },
  clusterList: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },

  // Cluster Card - Photo Collage Style
  clusterCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadows.medium,
  },
  // Photo Collage
  clusterCollage: {
    flexDirection: 'row',
    height: 160,
  },
  clusterMainPhoto: {
    flex: 1,
    marginRight: 2,
  },
  clusterMainPhotoImage: {
    width: '100%',
    height: '100%',
  },
  clusterSidePhotos: {
    width: 80,
    justifyContent: 'space-between',
  },
  clusterSidePhoto: {
    flex: 1,
    marginBottom: 2,
  },
  clusterSidePhotoLast: {
    marginBottom: 0,
  },
  clusterSidePhotoImage: {
    width: '100%',
    height: '100%',
  },
  clusterMoreOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clusterMoreText: {
    ...typography.bodyBold,
    color: colors.text.inverse,
  },
  // Distance Badge
  distanceBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.round,
  },
  distanceBadgeEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  distanceBadgeText: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '600',
    fontSize: 11,
  },
  // Upload Status Badge
  uploadStatusBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: borderRadius.sm,
  },
  uploadStatusIcon: {
    fontSize: 12,
  },
  uploadStatusCheck: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '700',
    marginLeft: 1,
  },
  // Card Info Section
  clusterInfo: {
    padding: spacing.lg,
  },
  clusterLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  clusterLocationIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  clusterLocationText: {
    ...typography.headline,
    color: colors.text.primary,
    flex: 1,
  },
  clusterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clusterMetaText: {
    ...typography.caption,
    color: colors.text.muted,
  },
  clusterMetaDot: {
    ...typography.caption,
    color: colors.text.muted,
    marginHorizontal: spacing.sm,
  },
  shareButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  shareButtonText: {
    fontSize: 18,
    color: colors.primary,
  },
  clusterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  clusterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clusterTitle: {
    ...typography.headline,
    color: colors.text.primary,
  },
  vacationBadge: {
    backgroundColor: colors.success,
    color: colors.text.inverse,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    marginRight: spacing.sm,
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clusterDate: {
    ...typography.subhead,
    color: colors.text.secondary,
    marginTop: 2,
  },
  clusterLocation: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 4,
  },
  viewAllButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
  },
  viewAllText: {
    color: colors.text.inverse,
    ...typography.caption,
    fontWeight: '600',
  },

  // Cluster Preview - Photo Strip
  clusterPreview: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  previewContainer: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
  },
  remainingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  remainingText: {
    color: colors.text.inverse,
    ...typography.bodyBold,
  },

  // Thumbnail
  thumbnail: {
    width: imageSize,
    height: imageSize,
    margin: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.divider,
  },
  // iCloud placeholder for photos that can't be loaded
  icloudPlaceholder: {
    backgroundColor: '#E8EDF3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icloudIcon: {
    fontSize: 24,
    opacity: 0.6,
  },

  // Messages & Buttons
  message: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.round,
    marginTop: spacing.xl,
    ...shadows.small,
  },
  buttonText: {
    color: colors.text.inverse,
    ...typography.button,
    textAlign: 'center',
  },

  // Fullscreen Image View
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: spacing.lg,
    marginRight: spacing.md,
  },
  closeText: {
    color: colors.text.inverse,
    fontSize: 18,
    fontWeight: '600',
  },
  fullImage: {
    flex: 1,
    width: '100%',
  },

  // Footer & Load More
  footerContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  loadMoreButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    ...shadows.small,
  },
  loadMoreButtonDisabled: {
    backgroundColor: colors.primaryLight,
  },
  loadMoreText: {
    color: colors.text.inverse,
    ...typography.button,
  },
  loadingMoreText: {
    color: colors.text.secondary,
    ...typography.subhead,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  endText: {
    textAlign: 'center',
    color: colors.text.muted,
    ...typography.caption,
    marginVertical: spacing.xl,
  },

  // Floating Buttons
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'column',
    gap: spacing.md,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
  },
  floatingButtonSecondary: {
    backgroundColor: colors.text.muted,
  },
  floatingButtonText: {
    fontSize: 24,
  },

  // Modal Overlay
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 100,
  },

  // Permission Denied State
  permissionIcon: {
    fontSize: 72,
    marginBottom: spacing.xl,
  },
  permissionTitle: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  permissionMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  secondaryButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  secondaryButtonText: {
    color: colors.primary,
    ...typography.bodyBold,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  emptyHint: {
    ...typography.subhead,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  // Error State
  errorIcon: {
    fontSize: 72,
    marginBottom: spacing.xl,
  },
  errorTitle: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorDetails: {
    ...typography.subhead,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  // Debug Button
  debugButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    marginLeft: spacing.md,
  },
  debugButtonText: {
    color: colors.text.inverse,
    fontSize: 11,
    fontWeight: '700',
  },

  // Trip Detail Screen
  tripHeader: {
    backgroundColor: colors.surface,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backButtonText: {
    fontSize: 28,
    color: colors.primary,
  },
  tripHeaderContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  tripEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  tripTagline: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  tripTitle: {
    ...typography.largeTitle,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  tripMeta: {
    ...typography.subhead,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  tripHint: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  tripGallery: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.md,
  },
  daySectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  daySectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  daySectionTitle: {
    ...typography.headline,
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  daySectionSubtitle: {
    ...typography.subhead,
    color: colors.text.muted,
  },
  addLocationButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addLocationButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  photoRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
  },

  // Collapsed Cluster Card (for unknown location)
  collapsedCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...shadows.small,
  },
  collapsedCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collapsedCardIcon: {
    fontSize: 20,
    marginRight: spacing.md,
    opacity: 0.6,
  },
  collapsedCardInfo: {
    flex: 1,
  },
  collapsedCardTitle: {
    ...typography.subhead,
    color: colors.text.secondary,
  },
  collapsedCardMeta: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2,
  },
  collapsedCardArrow: {
    fontSize: 24,
    color: colors.text.muted,
    marginLeft: spacing.sm,
  },

  // Onboarding Screen
  onboardingContainer: {
    flex: 1,
  },
  onboardingBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  onboardingOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xxl,
  },
  onboardingTop: {
    paddingTop: spacing.xxxl,
  },
  onboardingWelcome: {
    ...typography.headline,
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  onboardingTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  onboardingBottom: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    marginHorizontal: -spacing.xxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  onboardingTagline: {
    ...typography.title2,
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: spacing.xl,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  onboardingFeatures: {
    marginBottom: spacing.xl,
  },
  onboardingFeatureText: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: spacing.md,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  onboardingButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.lg + 2,
    paddingHorizontal: spacing.xxxl,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    ...shadows.large,
  },
  onboardingButtonText: {
    ...typography.button,
    color: colors.primary,
    fontSize: 18,
  },

  // Location Edit Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCancel: {
    ...typography.body,
    color: colors.primary,
  },
  modalTitle: {
    ...typography.headline,
    color: colors.text.primary,
  },
  modalDone: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  modalDoneDisabled: {
    color: colors.text.muted,
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  modalSubtitle: {
    ...typography.subhead,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  searchSpinner: {
    marginLeft: spacing.sm,
  },
  selectedLocationBox: {
    backgroundColor: colors.primaryLight || '#E3F2FD',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  selectedLocationLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  selectedLocationText: {
    ...typography.body,
    color: colors.text.primary,
  },
  locationResultsList: {
    flex: 1,
  },
  locationResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  locationResultItemSelected: {
    backgroundColor: colors.primaryLight || '#E3F2FD',
  },
  locationResultText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  locationResultCheck: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
