import { StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from './theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  closeButtonText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  title: {
    ...typography.headline,
    color: colors.text.primary,
  },
  saveButton: {
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  saveButtonTextDisabled: {
    color: colors.text.muted,
  },

  // Current location banner
  currentLocationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  currentLocationLabel: {
    ...typography.caption,
    color: colors.text.muted,
    marginRight: spacing.sm,
  },
  currentLocationText: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },

  // Search section
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
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
  searchIcon: {
    marginRight: spacing.md,
  },
  searchInput: {
    flex: 1,
    height: 48,
    ...typography.body,
    color: colors.text.primary,
  },
  clearButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },

  // Results section
  resultsSection: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
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

  // Loading state
  loadingContainer: {
    paddingVertical: spacing.xxxl,
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
  selectedContainer: {
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedIcon: {
    marginRight: spacing.md,
  },
  selectedTextContainer: {
    flex: 1,
  },
  selectedLabel: {
    ...typography.caption,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  selectedName: {
    ...typography.bodyBold,
    color: colors.text.primary,
  },
});
