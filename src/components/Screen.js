import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/theme';

/**
 * Screen - A reusable screen container component
 *
 * Props:
 * - title: string - Header title (optional if using logo)
 * - subtitle: string - Header subtitle
 * - logo: boolean - Show logo instead of title
 * - logoSource: require() - Custom logo source
 * - showHeader: boolean - Whether to show the header (default: true)
 * - onBack: function - Back button handler (shows back button if provided)
 * - backText: string - Custom back button text (default: "← Back")
 * - headerRight: React.Node - Component to render on right side of header
 * - loading: boolean - Show loading indicator
 * - loadingText: string - Text to show while loading
 * - scrollable: boolean - Use ScrollView instead of View (default: false)
 * - statusBarStyle: 'auto' | 'light' | 'dark' - Status bar style
 * - containerStyle: object - Additional container styles
 * - contentStyle: object - Additional content styles
 * - children: React.Node - Screen content
 */
export default function Screen({
  title,
  subtitle,
  logo = false,
  logoSource,
  showHeader = true,
  onBack,
  backText = '← Back',
  headerRight,
  loading = false,
  loadingText = 'Loading...',
  scrollable = false,
  statusBarStyle = 'auto',
  containerStyle,
  contentStyle,
  children,
}) {
  const ContentWrapper = scrollable ? ScrollView : View;
  const contentWrapperProps = scrollable
    ? { contentContainerStyle: [styles.scrollContent, contentStyle] }
    : { style: [styles.content, contentStyle] };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, containerStyle]} edges={['top', 'bottom']}>
        <StatusBar style={statusBarStyle} />

        {showHeader && (
          <View style={styles.header}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Text style={styles.backButtonText}>{backText}</Text>
              </TouchableOpacity>
            )}

            {logo ? (
              <Image
                source={logoSource || require('../../assets/app-logo-transparent.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            ) : title ? (
              <Text style={styles.title}>{title}</Text>
            ) : null}

            {subtitle && (
              <Text style={styles.subtitle}>{subtitle}</Text>
            )}

            {headerRight && (
              <View style={styles.headerRight}>
                {headerRight}
              </View>
            )}
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        ) : (
          <ContentWrapper {...contentWrapperProps}>
            {children}
          </ContentWrapper>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

/**
 * Screen.Modal - A screen variant for modal presentations
 */
Screen.Modal = function ModalScreen({
  title,
  onClose,
  closeText = '✕',
  children,
  scrollable = true,
  ...props
}) {
  return (
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{title}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>{closeText}</Text>
        </TouchableOpacity>
      </View>

      {scrollable ? (
        <ScrollView
          style={styles.modalContent}
          contentContainerStyle={styles.modalContentContainer}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.modalContent}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
};

/**
 * Screen.Splash - A splash/loading screen variant
 */
Screen.Splash = function SplashScreen({
  image,
  loadingText,
  showProgress = true,
}) {
  return (
    <View style={styles.splashContainer}>
      <StatusBar style="light" />
      <Image
        source={image || require('../../assets/vacation-splash.png')}
        style={styles.splashImage}
        resizeMode="cover"
      />
      <View style={styles.splashOverlay}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          {loadingText && (
            <Text style={styles.splashLoadingText}>{loadingText}</Text>
          )}
        </View>
      </View>
    </View>
  );
};

/**
 * Screen.Fullscreen - A fullscreen view with safe area overlay for controls
 * Use for image viewers, video players, etc.
 *
 * Props:
 * - onClose: function - Close button handler
 * - closeText: string - Close button text (default: "Close")
 * - backgroundColor: string - Background color (default: black)
 * - children: React.Node - Main content (image, video, etc.)
 */
Screen.Fullscreen = function FullscreenScreen({
  onClose,
  closeText = 'Close',
  backgroundColor = '#000',
  children,
}) {
  return (
    <SafeAreaProvider>
      <View style={[styles.fullscreenContainer, { backgroundColor }]}>
        <StatusBar style="light" />
        {children}
        <SafeAreaView style={styles.fullscreenOverlay} edges={['top']}>
          <TouchableOpacity style={styles.fullscreenCloseButton} onPress={onClose}>
            <Text style={styles.fullscreenCloseText}>{closeText}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
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
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  backButtonText: {
    ...typography.body,
    color: colors.primary,
  },
  headerRight: {
    position: 'absolute',
    right: spacing.xl,
    top: spacing.md,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.title,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.text.secondary,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: spacing.xl,
  },

  // Splash
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

  // Fullscreen
  fullscreenContainer: {
    flex: 1,
  },
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  fullscreenCloseButton: {
    alignSelf: 'flex-end',
    padding: spacing.lg,
    marginRight: spacing.md,
  },
  fullscreenCloseText: {
    color: colors.text.inverse,
    fontSize: 18,
    fontWeight: '600',
  },
});
