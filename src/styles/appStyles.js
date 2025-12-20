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
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadows.large,
  },
  splashLoadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
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
  headerLogo: {
    width: 220,
    height: 147,
    alignSelf: 'center',
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
    padding: spacing.md,
  },

  // Cluster Card
  clusterCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.small,
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  vacationBadge: {
    backgroundColor: '#34C759',
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  clusterDate: {
    ...typography.subhead,
    color: colors.text.secondary,
    marginTop: 2,
  },
  clusterLocation: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2,
  },
  viewAllButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  viewAllText: {
    color: colors.primary,
    ...typography.subhead,
    fontWeight: '500',
  },

  // Cluster Preview
  clusterPreview: {
    flexDirection: 'row',
  },
  previewContainer: {
    position: 'relative',
    marginRight: spacing.xs,
  },
  remainingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    margin: 2,
  },
  remainingText: {
    color: colors.text.inverse,
    ...typography.body,
    fontWeight: '600',
  },

  // Thumbnail
  thumbnail: {
    width: imageSize,
    height: imageSize,
    margin: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: '#e0e0e0',
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
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
  },
  buttonText: {
    color: colors.text.inverse,
    ...typography.button,
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
    marginBottom: spacing.xl,
  },
  loadMoreButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    minWidth: 180,
  },
  loadMoreButtonDisabled: {
    backgroundColor: '#5AC8FA',
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
    ...typography.subhead,
    marginVertical: spacing.xl,
  },

  // Floating Button
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
  },
  floatingButtonText: {
    fontSize: 24,
  },
});
