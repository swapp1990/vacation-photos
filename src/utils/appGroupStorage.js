/**
 * App Group Storage Utility
 *
 * Provides shared storage between the main app and App Clip
 * using iOS App Groups (NSUserDefaults with suite name).
 *
 * This allows the App Clip to pass the shareId to the main app
 * when the user installs the full app.
 */
import { NativeModules, Platform } from 'react-native';

const APP_GROUP_ID = 'group.com.swapp1990.vacationphotos';

// Native module for App Group storage (will be created in native code)
const { AppGroupStorage } = NativeModules;

/**
 * Set a value in App Group storage
 * @param {string} key - The key to store
 * @param {string} value - The value to store (must be a string)
 */
export async function setAppGroupData(key, value) {
  if (Platform.OS !== 'ios') {
    console.log('App Group storage is only available on iOS');
    return false;
  }

  try {
    if (AppGroupStorage && AppGroupStorage.setData) {
      await AppGroupStorage.setData(key, value);
      return true;
    } else {
      console.log('AppGroupStorage native module not available');
      return false;
    }
  } catch (error) {
    console.error('Error setting App Group data:', error);
    return false;
  }
}

/**
 * Get a value from App Group storage
 * @param {string} key - The key to retrieve
 * @returns {string|null} The stored value or null if not found
 */
export async function getAppGroupData(key) {
  if (Platform.OS !== 'ios') {
    console.log('App Group storage is only available on iOS');
    return null;
  }

  try {
    if (AppGroupStorage && AppGroupStorage.getData) {
      const value = await AppGroupStorage.getData(key);
      return value;
    } else {
      console.log('AppGroupStorage native module not available');
      return null;
    }
  } catch (error) {
    console.error('Error getting App Group data:', error);
    return null;
  }
}

/**
 * Remove a value from App Group storage
 * @param {string} key - The key to remove
 */
export async function removeAppGroupData(key) {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    if (AppGroupStorage && AppGroupStorage.removeData) {
      await AppGroupStorage.removeData(key);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error removing App Group data:', error);
    return false;
  }
}

/**
 * Check if there's a pending share from App Clip
 * @returns {object|null} Object with shareId and timestamp, or null
 */
export async function getPendingShare() {
  const shareId = await getAppGroupData('pendingShareId');
  const timestamp = await getAppGroupData('pendingShareTimestamp');

  if (!shareId) {
    return null;
  }

  // Check if the pending share is not too old (24 hours)
  if (timestamp) {
    const pendingTime = parseInt(timestamp, 10);
    const now = Date.now();
    const hoursDiff = (now - pendingTime) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      // Clear old pending share
      await clearPendingShare();
      return null;
    }
  }

  return { shareId, timestamp };
}

/**
 * Clear pending share data
 */
export async function clearPendingShare() {
  await removeAppGroupData('pendingShareId');
  await removeAppGroupData('pendingShareTimestamp');
}

export default {
  setAppGroupData,
  getAppGroupData,
  removeAppGroupData,
  getPendingShare,
  clearPendingShare,
};
