import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'vacation_photos_device_id';

/**
 * Generate a UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create a persistent device ID for this installation.
 * Used to identify anonymous users for subscription tracking.
 *
 * @returns {Promise<string>} The device ID (UUID)
 */
export async function getDeviceId() {
  try {
    // Check if we already have a device ID
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      // Generate and store a new one
      deviceId = generateUUID();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      console.log('Generated new device ID:', deviceId);
    }

    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Return a temporary ID if storage fails
    // This is not ideal but prevents the app from crashing
    return `temp-${generateUUID()}`;
  }
}

/**
 * Clear the device ID (useful for testing or account reset)
 */
export async function clearDeviceId() {
  try {
    await AsyncStorage.removeItem(DEVICE_ID_KEY);
  } catch (error) {
    console.error('Error clearing device ID:', error);
  }
}
