/**
 * SwapAnalytics Telemetry Client SDK
 *
 * Drop-in replacement for TelemetryDeck in React Native/Expo apps.
 * Same interface as analytics.js: init(), track(), trackNorthStar(), onAnalyticsEvent()
 *
 * Usage:
 *   import { initAnalytics, track, trackNorthStar, Events } from './telemetry-client';
 *   initAnalytics();
 *   track(Events.APP_OPENED);
 */

// --- Configuration ---
const TELEMETRY_API_URL = 'https://analytics.swapp1990.org/api/events';

let config = null;

// --- Environment Detection ---
function detectEnvironment() {
  // EAS build profiles set this via eas.json env block
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_ENVIRONMENT) {
    return process.env.EXPO_PUBLIC_ENVIRONMENT;
  }

  try {
    // Try Expo Constants
    const Constants = require('expo-constants').default;
    const appOwnership = Constants.appOwnership;
    const executionEnvironment = Constants.executionEnvironment;

    // Expo Go or development
    if (appOwnership === 'expo' || executionEnvironment === 'storeClient') {
      return 'development';
    }

    // Check for TestFlight: iOS receipt URL contains "sandboxReceipt"
    if (Constants.platform?.ios) {
      const receiptUrl = Constants.platform.ios.buildNumber;
      // In standalone builds, check if it's a store or testflight build
      if (executionEnvironment === 'standalone') {
        // TestFlight builds have a sandbox receipt
        try {
          const { Platform } = require('react-native');
          if (Platform.OS === 'ios') {
            // expo-application provides the install source
            try {
              const Application = require('expo-application');
              // appStoreReceiptURL contains "sandboxReceipt" for TestFlight
              if (Application.getInstallationTimeAsync) {
                // Fallback: use __DEV__ flag
                if (typeof __DEV__ !== 'undefined' && __DEV__) {
                  return 'development';
                }
              }
            } catch (e) {
              // expo-application not available
            }
          }
        } catch (e) {
          // react-native not available
        }
      }
    }

    // EAS build profile detection via extra/expoClient
    const manifest = Constants.expoConfig || Constants.manifest;
    if (manifest?.extra?.environment) {
      return manifest.extra.environment;
    }

    // Check EAS build channel
    const updateChannel = Constants.expoConfig?.updates?.requestHeaders?.['expo-channel-name'];
    if (updateChannel === 'preview' || updateChannel === 'testflight') {
      return 'testflight';
    }
    if (updateChannel === 'production') {
      return 'production';
    }

    // __DEV__ is the most reliable fallback for dev vs prod
    if (typeof __DEV__ !== 'undefined') {
      return __DEV__ ? 'development' : 'production';
    }
  } catch (e) {
    // expo-constants not available (web or non-Expo environment)
  }

  // Browser/web detection
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1') {
      return 'development';
    }
    return 'production';
  }

  return 'development';
}

// --- Anonymous Device ID ---
// Persisted UUID per install via AsyncStorage (Constants.installationId is deprecated)
let cachedDeviceId = null;

async function loadDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    let id = await AsyncStorage.getItem('_sa_device_id');
    if (!id) {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
      await AsyncStorage.setItem('_sa_device_id', id);
    }
    cachedDeviceId = id;
    return id;
  } catch (e) {
    return 'unknown';
  }
}

// --- Core SDK ---

/**
 * Initialize the telemetry client. Call once at app startup.
 * @param {string} [appId='lmwfy'] - App identifier
 */
export async function initAnalytics(appId = 'lmwfy') {
  if (config) return;
  try {
    const deviceId = await loadDeviceId();
    config = {
      appId,
      environment: detectEnvironment(),
      deviceId,
    };
    console.log(`[Analytics] Initialized: app=${config.appId} env=${config.environment} device=${config.deviceId.substring(0, 8)}`);
  } catch (error) {
    console.warn('[Analytics] Failed to initialize:', error);
  }
}

/**
 * Track an event with optional metadata.
 * Silently no-ops if not initialized.
 */
export function track(eventName, metadata = {}) {
  if (!config) {
    console.warn('[Analytics] Not initialized, skipping:', eventName);
    return;
  }

  const payload = {
    appId: config.appId,
    eventName,
    environment: config.environment,
    metadata,
    deviceId: config.deviceId,
  };

  sendEvent(payload)
    .then(() => {
      console.log('[Analytics] Sent:', eventName);
    })
    .catch((error) => {
      console.warn('[Analytics] Failed:', eventName, error);
    });
}

/**
 * Track the North Star metric (ai_result_accepted).
 */
export function trackNorthStar(metadata = {}) {
  track('lmwfy_ai_result_accepted', {
    ...metadata,
    is_north_star: 'true',
  });
}

// Event name constants
export const Events = {
  APP_OPENED: 'app_opened',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  STORY_CREATED: 'lmwfy_story_created',
  STORY_OPENED: 'lmwfy_story_opened',
  NOTE_TRIGGERED: 'lmwfy_note_triggered',
  AI_RESULT_ACCEPTED: 'lmwfy_ai_result_accepted',
  AI_RESULT_REJECTED: 'lmwfy_ai_result_rejected',
};

// --- Network ---
async function sendEvent(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(TELEMETRY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // One retry on failure
    if (error.name !== 'AbortError') {
      try {
        const retryResponse = await fetch(TELEMETRY_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (retryResponse.ok) {
          return await retryResponse.json();
        }
      } catch (retryError) {
        // Silently fail — analytics should never crash the app
      }
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
