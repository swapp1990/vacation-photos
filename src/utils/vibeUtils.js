/**
 * Utility for getting emoji and tagline based on vacation location
 */

/**
 * Get emoji and tagline based on location name
 * @param {string} locationName - Name of the location
 * @returns {Object} Object with emoji and tagline properties
 */
export function getLocationVibe(locationName) {
  if (!locationName) return { emoji: '📍', tagline: 'Your memories' };

  const name = locationName.toLowerCase();

  // Check for location keywords
  if (name.includes('beach') || name.includes('coast') || name.includes('ocean') || name.includes('sea')) {
    return { emoji: '🏖️', tagline: 'Beach vibes from' };
  }
  if (name.includes('mountain') || name.includes('mount') || name.includes('peak') || name.includes('summit')) {
    return { emoji: '🏔️', tagline: 'Mountain adventure in' };
  }
  if (name.includes('lake') || name.includes('falls') || name.includes('river')) {
    return { emoji: '🌊', tagline: 'Waterside memories from' };
  }
  if (name.includes('forest') || name.includes('park') || name.includes('trail') || name.includes('canyon')) {
    return { emoji: '🌲', tagline: 'Nature escape to' };
  }
  if (name.includes('island')) {
    return { emoji: '🏝️', tagline: 'Island getaway to' };
  }
  if (name.includes('desert') || name.includes('valley')) {
    return { emoji: '🏜️', tagline: 'Desert adventure in' };
  }
  if (name.includes('snow') || name.includes('ski') || name.includes('winter')) {
    return { emoji: '❄️', tagline: 'Winter wonderland in' };
  }
  if (name.includes('vegas') || name.includes('casino')) {
    return { emoji: '🎰', tagline: 'Good times in' };
  }
  if (name.includes('disney') || name.includes('theme') || name.includes('world')) {
    return { emoji: '🎢', tagline: 'Fun times at' };
  }
  if (name.includes('new york') || name.includes('san francisco') || name.includes('los angeles') || name.includes('chicago')) {
    return { emoji: '🌆', tagline: 'City adventure in' };
  }

  // Default based on country
  if (name.includes('japan')) return { emoji: '🗾', tagline: 'Journey to' };
  if (name.includes('france') || name.includes('paris')) return { emoji: '🗼', tagline: 'Romance in' };
  if (name.includes('italy') || name.includes('rome')) return { emoji: '🍝', tagline: 'La dolce vita in' };
  if (name.includes('mexico')) return { emoji: '🌮', tagline: 'Fiesta in' };
  if (name.includes('hawaii')) return { emoji: '🌺', tagline: 'Aloha from' };
  if (name.includes('india')) return { emoji: '🕌', tagline: 'Incredible' };

  // Generic adventure
  return { emoji: '✈️', tagline: 'Your trip to' };
}
