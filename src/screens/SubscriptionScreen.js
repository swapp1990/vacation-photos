import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSubscription } from '../hooks/useSubscription';
import { ErrorCodes, subscriptionService } from '../services/subscriptionService';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/theme';

/**
 * Subscription/Paywall Screen
 *
 * Shows subscription options with comprehensive error handling
 */
export default function SubscriptionScreen({ onClose, onSubscribed }) {
  const {
    isLoading,
    product,
    subscription,
    isSubscribed,
    error,
    errorMessage,
    isPurchasing,
    isRestoring,
    purchase,
    restore,
    clearError,
    retry,
  } = useSubscription();

  // Mock mode state
  const isMockMode = subscriptionService.isInMockMode();
  const mockScenarios = subscriptionService.getMockScenarios();
  const [selectedScenario, setSelectedScenario] = useState('success');

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleScenarioChange = (scenario) => {
    setSelectedScenario(scenario);
    subscriptionService.setMockScenario(scenario);
  };

  const handlePurchase = async () => {
    clearError();
    const result = await purchase();

    if (result.success && !result.pending) {
      onSubscribed?.();
    }
  };

  // ---------------------------------------------------------------------------
  // MOCK MODE BANNER
  // ---------------------------------------------------------------------------

  const renderMockModeBanner = () => {
    if (!isMockMode) return null;

    return (
      <View style={styles.mockBanner}>
        <Text style={styles.mockBannerTitle}>MOCK MODE (Expo Go)</Text>
        <Text style={styles.mockBannerSubtitle}>Select a scenario to test:</Text>
        <View style={styles.scenarioButtons}>
          {Object.entries(mockScenarios).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.scenarioButton,
                selectedScenario === value && styles.scenarioButtonActive,
              ]}
              onPress={() => handleScenarioChange(value)}
            >
              <Text style={[
                styles.scenarioButtonText,
                selectedScenario === value && styles.scenarioButtonTextActive,
              ]}>
                {key.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const handleRestore = async () => {
    clearError();
    const result = await restore();

    if (result.success) {
      if (result.subscription?.isActive) {
        Alert.alert(
          'Subscription Restored',
          'Your subscription has been restored successfully!',
          [{ text: 'OK', onPress: onSubscribed }]
        );
      } else {
        Alert.alert(
          'No Active Subscription',
          'Your previous subscription has expired. Please subscribe again to continue.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleRetry = () => {
    clearError();
    retry();
  };

  // ---------------------------------------------------------------------------
  // ERROR DISPLAY
  // ---------------------------------------------------------------------------

  const renderError = () => {
    if (!error) return null;

    // Determine error severity and style
    const isWarning = error.code === ErrorCodes.PURCHASE_CANCELLED;
    const isRecoverable = [
      ErrorCodes.NETWORK_ERROR,
      ErrorCodes.CONNECTION_FAILED,
      ErrorCodes.PRODUCT_FETCH_FAILED,
      ErrorCodes.VERIFICATION_FAILED,
      ErrorCodes.BACKEND_ERROR,
    ].includes(error.code);

    return (
      <View style={[
        styles.errorContainer,
        isWarning && styles.warningContainer,
      ]}>
        <Text style={[
          styles.errorIcon,
          isWarning && styles.warningIcon,
        ]}>
          {isWarning ? '!' : 'x'}
        </Text>
        <View style={styles.errorContent}>
          <Text style={[
            styles.errorTitle,
            isWarning && styles.warningTitle,
          ]}>
            {isWarning ? 'Cancelled' : 'Error'}
          </Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>

          {/* Show error code for debugging */}
          <Text style={styles.errorCode}>Code: {error.code}</Text>

          {/* Show original error if available */}
          {error.originalError?.message && (
            <Text style={styles.errorDetail}>
              Details: {error.originalError.message}
            </Text>
          )}
        </View>

        {isRecoverable && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={clearError}
        >
          <Text style={styles.dismissButtonText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <StatusBar style="dark" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading subscription info...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // ---------------------------------------------------------------------------
  // ALREADY SUBSCRIBED
  // ---------------------------------------------------------------------------

  if (isSubscribed) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <StatusBar style="dark" />
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.subscribedContainer}>
            <Text style={styles.subscribedIcon}>*</Text>
            <Text style={styles.subscribedTitle}>You're a Pro!</Text>
            <Text style={styles.subscribedMessage}>
              Thank you for subscribing. You have access to all premium features.
            </Text>

            {subscription?.expiresAt && (
              <Text style={styles.expiryText}>
                Renews: {subscription.expiresAt.toLocaleDateString()}
              </Text>
            )}

            <TouchableOpacity
              style={styles.continueButton}
              onPress={onClose}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN PAYWALL UI
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="dark" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Mock Mode Banner */}
          {renderMockModeBanner()}

          {/* Error Display */}
          {renderError()}

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroIcon}>*</Text>
            <Text style={styles.heroTitle}>Upgrade to Pro</Text>
            <Text style={styles.heroSubtitle}>
              Unlock all premium features for your vacation memories
            </Text>
          </View>

          {/* Features List */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>What's included:</Text>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>+</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>AI Story Generation</Text>
                <Text style={styles.featureDescription}>
                  Create beautiful stories from your vacation photos
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>+</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Unlimited Exports</Text>
                <Text style={styles.featureDescription}>
                  Export your trips in high quality
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>+</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>No Ads</Text>
                <Text style={styles.featureDescription}>
                  Enjoy an ad-free experience
                </Text>
              </View>
            </View>
          </View>

          {/* Pricing Card */}
          <View style={styles.pricingCard}>
            {product ? (
              <>
                <Text style={styles.pricingTitle}>{product.title}</Text>
                <Text style={styles.pricingPrice}>{product.price}</Text>
                <Text style={styles.pricingPeriod}>
                  per {product.subscriptionPeriod}
                </Text>
                <Text style={styles.pricingDescription}>
                  {product.description}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.pricingTitle}>Pro Subscription</Text>
                <Text style={styles.pricingError}>
                  Price unavailable - tap Subscribe to load
                </Text>
              </>
            )}
          </View>

          {/* Subscribe Button */}
          <TouchableOpacity
            style={[
              styles.subscribeButton,
              (isPurchasing || isRestoring) && styles.buttonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={isPurchasing || isRestoring}
          >
            {isPurchasing ? (
              <View style={styles.buttonLoading}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.subscribeButtonText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.subscribeButtonText}>
                Subscribe{product?.price ? ` - ${product.price}` : ''}
              </Text>
            )}
          </TouchableOpacity>

          {/* Restore Button */}
          <TouchableOpacity
            style={[
              styles.restoreButton,
              (isPurchasing || isRestoring) && styles.buttonDisabled,
            ]}
            onPress={handleRestore}
            disabled={isPurchasing || isRestoring}
          >
            {isRestoring ? (
              <View style={styles.buttonLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.restoreButtonText}>Restoring...</Text>
              </View>
            ) : (
              <Text style={styles.restoreButtonText}>Restore Purchase</Text>
            )}
          </TouchableOpacity>

          {/* Legal Links */}
          <View style={styles.legalSection}>
            <Text style={styles.legalText}>
              Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
            </Text>
            <View style={styles.legalLinks}>
              <TouchableOpacity>
                <Text style={styles.legalLink}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>|</Text>
              <TouchableOpacity>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.text.secondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: 0,
  },

  // Error
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  warningContainer: {
    backgroundColor: '#FEF3C7',
    borderLeftColor: '#F59E0B',
  },
  errorIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: spacing.sm,
  },
  warningIcon: {
    color: '#F59E0B',
  },
  errorContent: {
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.headline,
    color: '#B91C1C',
    marginBottom: spacing.xs,
  },
  warningTitle: {
    color: '#B45309',
  },
  errorMessage: {
    ...typography.body,
    color: '#7F1D1D',
    marginBottom: spacing.xs,
  },
  errorCode: {
    ...typography.caption,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  errorDetail: {
    ...typography.caption,
    color: '#9CA3AF',
    marginTop: spacing.xs,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  dismissButton: {
    alignSelf: 'flex-start',
  },
  dismissButtonText: {
    color: '#6B7280',
    ...typography.caption,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  heroIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.largeTitle,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Features
  featuresSection: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  featureIcon: {
    fontSize: 20,
    color: colors.primary,
    marginRight: spacing.md,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    ...typography.subhead,
    color: colors.text.secondary,
  },

  // Pricing
  pricingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.medium,
  },
  pricingTitle: {
    ...typography.headline,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  pricingPrice: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
  },
  pricingPeriod: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  pricingDescription: {
    ...typography.subhead,
    color: colors.text.muted,
    textAlign: 'center',
  },
  pricingError: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Buttons
  subscribeButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.small,
  },
  subscribeButtonText: {
    color: '#fff',
    ...typography.button,
    fontSize: 18,
  },
  restoreButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  restoreButtonText: {
    color: colors.primary,
    ...typography.body,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // Subscribed
  subscribedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  subscribedIcon: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  subscribedTitle: {
    ...typography.largeTitle,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  subscribedMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  expiryText: {
    ...typography.subhead,
    color: colors.text.muted,
    marginBottom: spacing.xxl,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
  },
  continueButtonText: {
    color: '#fff',
    ...typography.button,
  },

  // Legal
  legalSection: {
    alignItems: 'center',
  },
  legalText: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legalLink: {
    ...typography.caption,
    color: colors.primary,
  },
  legalSeparator: {
    ...typography.caption,
    color: colors.text.muted,
    marginHorizontal: spacing.sm,
  },

  // Mock Mode
  mockBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  mockBannerTitle: {
    ...typography.headline,
    color: '#B45309',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  mockBannerSubtitle: {
    ...typography.subhead,
    color: '#92400E',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  scenarioButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  scenarioButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: '#FDE68A',
  },
  scenarioButtonActive: {
    backgroundColor: '#F59E0B',
  },
  scenarioButtonText: {
    ...typography.caption,
    color: '#92400E',
    fontWeight: '500',
  },
  scenarioButtonTextActive: {
    color: '#fff',
  },
});
