/**
 * Clustering utilities for grouping vacation photos by location and time
 */

// Constants for distance thresholds
export const MILES_FROM_HOME = 50;
export const KM_FROM_HOME = MILES_FROM_HOME * 1.60934;
const CLUSTER_THRESHOLD_KM = 50;
const MERGE_THRESHOLD_KM = 50; // ~31 miles - slightly higher than clustering to catch edge cases
const TIME_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours for location inference

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Infer location for photos without location based on surrounding photos in time
 * @param {Array} photos - Array of photo objects
 * @returns {Array} Photos with inferred locations where possible
 */
export function inferMissingLocations(photos) {
  if (photos.length === 0) return photos;

  // Sort by creation time
  const sorted = [...photos].sort((a, b) => a.creationTime - b.creationTime);

  let inferredCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const photo = sorted[i];

    // Skip if photo already has location
    if (photo.location) continue;

    const photoTime = photo.creationTime;

    // Look for nearest photo with location before and after
    let prevWithLocation = null;
    let nextWithLocation = null;

    // Search backwards for photo with location
    for (let j = i - 1; j >= 0; j--) {
      if (sorted[j].location) {
        prevWithLocation = sorted[j];
        break;
      }
    }

    // Search forwards for photo with location
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].location) {
        nextWithLocation = sorted[j];
        break;
      }
    }

    // Determine which nearby photo's location to use
    let locationSource = null;

    if (prevWithLocation && nextWithLocation) {
      // Both exist - check if they're in the same location (within 30 miles)
      const prevTime = prevWithLocation.creationTime;
      const nextTime = nextWithLocation.creationTime;
      const prevTimeDiff = photoTime - prevTime;
      const nextTimeDiff = nextTime - photoTime;

      // Check if both are within time window
      const prevInWindow = prevTimeDiff <= TIME_WINDOW_MS;
      const nextInWindow = nextTimeDiff <= TIME_WINDOW_MS;

      if (prevInWindow && nextInWindow) {
        // Check if prev and next are in the same general location
        const distance = getDistanceKm(
          prevWithLocation.location.latitude,
          prevWithLocation.location.longitude,
          nextWithLocation.location.latitude,
          nextWithLocation.location.longitude
        );

        if (distance <= 48) { // ~30 miles - same location
          // Use the closer one in time
          locationSource = prevTimeDiff <= nextTimeDiff ? prevWithLocation : nextWithLocation;
        }
        // If different locations, don't infer (could be in transit)
      } else if (prevInWindow) {
        locationSource = prevWithLocation;
      } else if (nextInWindow) {
        locationSource = nextWithLocation;
      }
    } else if (prevWithLocation) {
      const timeDiff = photoTime - prevWithLocation.creationTime;
      if (timeDiff <= TIME_WINDOW_MS) {
        locationSource = prevWithLocation;
      }
    } else if (nextWithLocation) {
      const timeDiff = nextWithLocation.creationTime - photoTime;
      if (timeDiff <= TIME_WINDOW_MS) {
        locationSource = nextWithLocation;
      }
    }

    // Assign inferred location
    if (locationSource) {
      photo.location = locationSource.location;
      photo.distanceFromHome = locationSource.distanceFromHome;
      photo.locationInferred = true; // Mark as inferred
      inferredCount++;
    }
  }

  if (inferredCount > 0) {
    console.log(`Inferred location for ${inferredCount} photos`);
  }

  return sorted;
}

/**
 * Find the most common location from a list of day locations
 * Groups nearby locations and returns the centroid of the largest group
 * @param {Array} dayLocations - Array of {latitude, longitude} objects
 * @param {number} thresholdKm - Distance threshold for grouping
 * @returns {Object|null} Centroid of the largest group
 */
export function getMostCommonLocation(dayLocations, thresholdKm) {
  if (dayLocations.length === 0) return null;
  if (dayLocations.length === 1) return dayLocations[0];

  // Group locations that are within threshold of each other
  const groups = [];

  for (const loc of dayLocations) {
    let addedToGroup = false;

    for (const group of groups) {
      // Check if this location is near the group's centroid
      const groupCentroid = {
        latitude: group.locations.reduce((sum, l) => sum + l.latitude, 0) / group.locations.length,
        longitude: group.locations.reduce((sum, l) => sum + l.longitude, 0) / group.locations.length,
      };

      const distance = getDistanceKm(
        loc.latitude,
        loc.longitude,
        groupCentroid.latitude,
        groupCentroid.longitude
      );

      if (distance <= thresholdKm) {
        group.locations.push(loc);
        addedToGroup = true;
        break;
      }
    }

    if (!addedToGroup) {
      groups.push({ locations: [loc] });
    }
  }

  // Find the group with the most days (locations)
  const largestGroup = groups.reduce((max, group) =>
    group.locations.length > max.locations.length ? group : max
  );

  // Return the centroid of the largest group
  return {
    latitude: largestGroup.locations.reduce((sum, l) => sum + l.latitude, 0) / largestGroup.locations.length,
    longitude: largestGroup.locations.reduce((sum, l) => sum + l.longitude, 0) / largestGroup.locations.length,
  };
}

/**
 * Check if two date ranges overlap or are adjacent (within 1 day)
 * @param {Date} start1 - Start of first range
 * @param {Date} end1 - End of first range
 * @param {Date} start2 - Start of second range
 * @param {Date} end2 - End of second range
 * @returns {boolean} True if ranges overlap or are adjacent
 */
export function datesOverlapOrAdjacent(start1, end1, start2, end2) {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  // Extend ranges by 1 day to catch adjacent trips
  const extendedStart1 = new Date(start1.getTime() - ONE_DAY_MS);
  const extendedEnd1 = new Date(end1.getTime() + ONE_DAY_MS);
  // Check if ranges overlap
  return extendedStart1 <= end2 && extendedEnd1 >= start2;
}

/**
 * Merge clusters that are at the same location AND have overlapping dates
 * @param {Array} clusters - Array of cluster objects
 * @returns {Array} Merged clusters
 */
export function mergeClusters(clusters) {
  let merged = true;

  while (merged) {
    merged = false;
    for (let i = 0; i < clusters.length; i++) {
      if (!clusters[i].location) continue; // Skip unknown location cluster

      for (let j = i + 1; j < clusters.length; j++) {
        if (!clusters[j].location) continue;

        // Check location proximity
        const distance = getDistanceKm(
          clusters[i].location.latitude,
          clusters[i].location.longitude,
          clusters[j].location.latitude,
          clusters[j].location.longitude
        );

        // Check date overlap - only merge if same location AND dates overlap
        const datesMatch = datesOverlapOrAdjacent(
          clusters[i].startDate, clusters[i].endDate,
          clusters[j].startDate, clusters[j].endDate
        );

        if (distance <= MERGE_THRESHOLD_KM && datesMatch) {
          // Merge cluster j into cluster i
          clusters[i].photos = [...clusters[i].photos, ...clusters[j].photos];
          clusters[i].photos.sort((a, b) => a.creationTime - b.creationTime);

          // Update date range
          if (clusters[j].startDate < clusters[i].startDate) {
            clusters[i].startDate = clusters[j].startDate;
          }
          if (clusters[j].endDate > clusters[i].endDate) {
            clusters[i].endDate = clusters[j].endDate;
          }

          // Recalculate days
          clusters[i].days = Math.ceil(
            (clusters[i].endDate - clusters[i].startDate) / (1000 * 60 * 60 * 24)
          ) + 1;

          // Keep locationName if one has it
          if (!clusters[i].locationName && clusters[j].locationName) {
            clusters[i].locationName = clusters[j].locationName;
          }

          // Remove merged cluster
          clusters.splice(j, 1);
          merged = true;
          break;
        }
      }
      if (merged) break;
    }
  }

  return clusters;
}

/**
 * Cluster photos by location and time into vacation groups
 * @param {Array} photosWithMeta - Array of photos with metadata
 * @returns {Array} Array of vacation clusters
 */
export function clusterPhotos(photosWithMeta) {
  if (photosWithMeta.length === 0) return [];

  // First, infer missing locations based on surrounding photos
  const photosWithInferred = inferMissingLocations(photosWithMeta);

  // Step 1: Group photos by day and calculate each day's location
  const dayGroups = {};
  let unknownLocationPhotos = [];

  for (const photo of photosWithInferred) {
    if (!photo.location) {
      unknownLocationPhotos.push(photo);
      continue;
    }

    const dateKey = new Date(photo.creationTime).toDateString();
    if (!dayGroups[dateKey]) {
      dayGroups[dateKey] = [];
    }
    dayGroups[dateKey].push(photo);
  }

  // Step 2: Create day-clusters with each day's centroid location
  const dayClusters = [];
  for (const dateKey in dayGroups) {
    const photos = dayGroups[dateKey];
    const date = new Date(dateKey);

    // Calculate centroid for this day's photos
    const avgLat = photos.reduce((sum, p) => sum + Number(p.location.latitude), 0) / photos.length;
    const avgLon = photos.reduce((sum, p) => sum + Number(p.location.longitude), 0) / photos.length;

    dayClusters.push({
      id: `day-${dayClusters.length}`,
      photos: photos,
      startDate: date,
      endDate: date,
      location: { latitude: avgLat, longitude: avgLon },
      locationName: null,
    });
  }

  // Sort day-clusters by date
  dayClusters.sort((a, b) => a.startDate - b.startDate);

  // Step 3: Merge adjacent day-clusters that are within 50km
  const clusters = [];

  for (const dayCluster of dayClusters) {
    let merged = false;

    // Try to merge with an existing cluster
    for (const cluster of clusters) {
      const distance = getDistanceKm(
        dayCluster.location.latitude,
        dayCluster.location.longitude,
        cluster.location.latitude,
        cluster.location.longitude
      );

      // Check if within distance AND dates are adjacent (within 1 day)
      const dayGap = Math.abs(dayCluster.startDate - cluster.endDate) / (1000 * 60 * 60 * 24);

      if (distance <= CLUSTER_THRESHOLD_KM && dayGap <= 1) {
        // Merge into existing cluster
        cluster.photos = [...cluster.photos, ...dayCluster.photos];
        if (dayCluster.endDate > cluster.endDate) {
          cluster.endDate = dayCluster.endDate;
        }
        // Track this day's location for later - we'll pick the most common one
        cluster.dayLocations.push(dayCluster.location);
        merged = true;
        break;
      }
    }

    if (!merged) {
      clusters.push({
        id: `cluster-${clusters.length}`,
        photos: [...dayCluster.photos],
        startDate: dayCluster.startDate,
        endDate: dayCluster.endDate,
        location: dayCluster.location,
        dayLocations: [dayCluster.location], // Track all day locations
        locationName: null,
      });
    }
  }

  // Step 4: For each cluster, pick the location where user stayed most days
  for (const cluster of clusters) {
    if (cluster.dayLocations && cluster.dayLocations.length > 1) {
      cluster.location = getMostCommonLocation(cluster.dayLocations, CLUSTER_THRESHOLD_KM);
    }
    delete cluster.dayLocations; // Clean up temporary field
  }

  // Add unknown location cluster if it exists
  if (unknownLocationPhotos.length > 0) {
    const dates = unknownLocationPhotos.map(p => new Date(p.creationTime));
    clusters.push({
      id: 'cluster-unknown',
      photos: unknownLocationPhotos,
      startDate: new Date(Math.min(...dates)),
      endDate: new Date(Math.max(...dates)),
      location: null,
      locationName: 'Unknown Location',
    });
  }

  // Finalize clusters
  for (const cluster of clusters) {
    cluster.photos.sort((a, b) => new Date(a.creationTime) - new Date(b.creationTime));
    const days = Math.ceil((cluster.endDate - cluster.startDate) / (1000 * 60 * 60 * 24)) + 1;
    cluster.isVacation = cluster.photos.length >= 3;
    cluster.days = days;
  }

  // Merge clusters that are at the same location AND have overlapping dates
  const mergedClusters = mergeClusters(clusters);

  // Sort clusters by most recent first, but keep unknown location cluster last
  mergedClusters.sort((a, b) => {
    // Unknown location cluster always goes last
    if (a.id === 'cluster-unknown') return 1;
    if (b.id === 'cluster-unknown') return -1;
    return b.endDate - a.endDate;
  });

  return mergedClusters;
}
