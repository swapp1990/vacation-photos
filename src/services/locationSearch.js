import * as Location from 'expo-location';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'VacationPhotosApp/1.0';

/**
 * Search for locations using Nominatim API
 * @param {string} query - Search query (city, address, etc.)
 * @returns {Promise<Array>} Array of location results
 */
export async function searchLocations(query) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
      {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.log('Nominatim search failed:', response.status);
      return [];
    }

    const results = await response.json();
    return results.map(parseNominatimResult);
  } catch (error) {
    console.log('Location search error:', error.message);
    return [];
  }
}

/**
 * Parse a Nominatim result into a simplified location object
 */
function parseNominatimResult(result) {
  const { address } = result;

  // Build a readable display name
  const city = address?.city || address?.town || address?.village || address?.municipality;
  const state = address?.state;
  const country = address?.country;

  let displayName = '';
  if (city) displayName = city;
  if (state) displayName += displayName ? `, ${state}` : state;
  if (country) displayName += displayName ? `, ${country}` : country;

  // Fallback to original display_name if we couldn't build one
  if (!displayName) {
    displayName = result.display_name?.split(',').slice(0, 3).join(',').trim();
  }

  return {
    id: result.place_id,
    displayName,
    fullName: result.display_name,
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
    type: result.type,
  };
}

/**
 * Get current device location
 * @returns {Promise<{latitude: number, longitude: number, displayName: string}>}
 */
export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Location permission not granted');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const { latitude, longitude } = location.coords;

  // Reverse geocode to get a display name
  let displayName = 'Current Location';
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (address) {
      const parts = [address.city, address.region, address.country].filter(Boolean);
      displayName = parts.join(', ') || 'Current Location';
    }
  } catch (error) {
    console.log('Reverse geocode failed:', error.message);
  }

  return {
    latitude,
    longitude,
    displayName,
  };
}

/**
 * Creates a debounced version of the search function
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Function} Debounced search function
 */
export function createDebouncedSearch(delay = 300) {
  let timeoutId = null;

  return (query, callback) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      const results = await searchLocations(query);
      callback(results);
    }, delay);
  };
}
