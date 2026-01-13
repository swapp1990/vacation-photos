import { StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from './theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  header: {
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.largeTitle,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 24,
  },

  // Search section
  searchSection: {
    marginTop: spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  searchContainerFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  searchIcon: {
    marginRight: spacing.md,
  },
  searchInput: {
    flex: 1,
    height: 52,
    ...typography.body,
    color: colors.text.primary,
  },
  clearButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },

  // Current location button
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  currentLocationButtonLoading: {
    opacity: 0.7,
  },
  currentLocationIcon: {
    marginRight: spacing.md,
  },
  currentLocationText: {
    ...typography.bodyBold,
    color: colors.primary,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.text.muted,
    marginHorizontal: spacing.lg,
  },

  // Results list
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    paddingBottom: spacing.xl,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  resultIcon: {
    marginRight: spacing.md,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    ...typography.bodyBold,
    color: colors.text.primary,
  },
  resultFullName: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  selectedIndicator: {
    marginLeft: spacing.md,
  },

  // Loading state
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.subhead,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },

  // Empty state
  emptyContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
  },

  // Selected location display
  selectedLocationContainer: {
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedLocationIcon: {
    marginRight: spacing.md,
  },
  selectedLocationTextContainer: {
    flex: 1,
  },
  selectedLocationLabel: {
    ...typography.caption,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  selectedLocationName: {
    ...typography.bodyBold,
    color: colors.text.primary,
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.lg,
    backgroundColor: colors.background,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  continueButtonDisabled: {
    backgroundColor: colors.border,
    ...shadows.small,
  },
  continueButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  continueButtonTextDisabled: {
    color: colors.text.muted,
  },
});
