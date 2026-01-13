import React, { useState, useEffect, memo } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import styles from '../styles/appStyles';
import { uriCache } from '../utils/photoProcessing';

// Format date range for display
export function formatDateRange(start, end) {
  const options = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', options);
  const year = start.getFullYear();

  if (startStr === endStr) {
    return `${startStr}, ${year}`;
  }
  return `${startStr} - ${endStr}, ${year}`;
}

// Get distance emoji based on miles
function getDistanceEmoji(miles) {
  if (miles < 100) return '🚗';
  if (miles < 500) return '🚂';
  if (miles < 1500) return '✈️';
  if (miles < 5000) return '🌍';
  return '🚀';
}

// Collage photo component with lazy loading
export const CollagePhoto = memo(({ photo, style, imageStyle }) => {
  const [uri, setUri] = useState(() => photo ? uriCache.get(photo.id) || null : null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!photo || uri) return;

    const cached = uriCache.get(photo.id);
    if (cached) {
      setUri(cached);
      return;
    }

    let mounted = true;
    MediaLibrary.getAssetInfoAsync(photo.id)
      .then((info) => {
        const photoUri = info.localUri || info.uri;
        if (photoUri) {
          uriCache.set(photo.id, photoUri);
        }
        if (mounted) {
          setUri(photoUri);
        }
      })
      .catch((err) => {
        if (mounted) setLoadError(true);
      });
    return () => { mounted = false; };
  }, [photo?.id, uri]);

  if (loadError) {
    return (
      <View style={style}>
        <View style={[imageStyle, styles.icloudPlaceholder]}>
          <Text style={styles.icloudIcon}>☁️</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={style}>
      {uri ? (
        <Image
          source={{ uri }}
          style={imageStyle}
          onError={() => setLoadError(true)}
        />
      ) : (
        <View style={[imageStyle, { backgroundColor: '#E2E8F0' }]} />
      )}
    </View>
  );
});

// Photo collage layout used by both ClusterCard and YearCard
function PhotoCollage({ photos, remaining, avgDistanceMiles }) {
  return (
    <View style={styles.clusterCollage}>
      {/* Main large photo */}
      <CollagePhoto
        photo={photos[0]}
        style={styles.clusterMainPhoto}
        imageStyle={styles.clusterMainPhotoImage}
      />
      {/* Side photos */}
      {photos.length > 1 && (
        <View style={styles.clusterSidePhotos}>
          {photos.slice(1, 4).map((photo, index) => (
            <View
              key={`${photo.id}-${index}`}
              style={[
                styles.clusterSidePhoto,
                index === Math.min(photos.length - 2, 2) && styles.clusterSidePhotoLast,
              ]}
            >
              <CollagePhoto
                photo={photo}
                style={{ flex: 1 }}
                imageStyle={styles.clusterSidePhotoImage}
              />
              {/* Show +N overlay on last photo if more exist */}
              {index === 2 && remaining > 0 && (
                <View style={styles.clusterMoreOverlay}>
                  <Text style={styles.clusterMoreText}>+{remaining}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
      {/* Distance badge overlay */}
      {avgDistanceMiles && (
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceBadgeEmoji}>{getDistanceEmoji(avgDistanceMiles)}</Text>
          <Text style={styles.distanceBadgeText}>{avgDistanceMiles.toLocaleString()} mi</Text>
        </View>
      )}
    </View>
  );
}

// Main cluster card component
export function ClusterCard({ cluster, onViewAll, photosWithFaces = {} }) {
  // Get the best photos for the collage, prioritizing ones with faces for the cover
  const getCollagePhotos = () => {
    const allPhotos = cluster.photos;
    if (allPhotos.length === 0) return [];

    // Find the first photo with a face to use as cover
    const photoWithFace = allPhotos.find(p => photosWithFaces[p.id] === true);

    if (photoWithFace && photoWithFace.id !== allPhotos[0].id) {
      // Put the photo with face first, then fill with others
      const otherPhotos = allPhotos.filter(p => p.id !== photoWithFace.id).slice(0, 3);
      return [photoWithFace, ...otherPhotos];
    }

    // Default: just use first 4 photos
    return allPhotos.slice(0, 4);
  };

  const photos = getCollagePhotos();
  const remaining = cluster.photos.length - 4;

  const locationName = cluster.locationName ||
    (cluster.location
      ? `${Number(cluster.location.latitude).toFixed(1)}°, ${Number(cluster.location.longitude).toFixed(1)}°`
      : 'Unknown Location');

  // Calculate average distance from home (convert km to miles)
  const photosWithDistance = cluster.photos.filter(p => p.distanceFromHome != null);
  const avgDistanceKm = photosWithDistance.length > 0
    ? photosWithDistance.reduce((sum, p) => sum + p.distanceFromHome, 0) / photosWithDistance.length
    : null;
  const avgDistanceMiles = avgDistanceKm ? Math.round(avgDistanceKm * 0.621371) : null;

  return (
    <TouchableOpacity style={styles.clusterCard} onPress={() => onViewAll(cluster)} activeOpacity={0.9}>
      <PhotoCollage photos={photos} remaining={remaining} avgDistanceMiles={avgDistanceMiles} />

      {/* Info Section */}
      <View style={styles.clusterInfo}>
        <View style={styles.clusterLocationRow}>
          <Text style={styles.clusterLocationText}>{locationName}</Text>
        </View>
        <View style={styles.clusterMeta}>
          <Text style={styles.clusterMetaText}>{cluster.photos.length} photos</Text>
          <Text style={styles.clusterMetaDot}>·</Text>
          <Text style={styles.clusterMetaText}>
            {formatDateRange(cluster.startDate, cluster.endDate)}
          </Text>
          {cluster.days > 1 && (
            <>
              <Text style={styles.clusterMetaDot}>·</Text>
              <Text style={styles.clusterMetaText}>{cluster.days} days</Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Year card - same style as ClusterCard but aggregates multiple clusters
export function YearCard({ year, clusters, onPress }) {
  // Get unique locations (max 3) for display
  const locations = [...new Set(clusters.map(c => c.locationName?.split(',')[0]).filter(Boolean))].slice(0, 3);
  const totalPhotos = clusters.reduce((sum, c) => sum + c.photos.length, 0);

  // Gather unique photos from clusters for the collage (first 4, one per cluster if possible)
  const allPhotos = [];
  const seenIds = new Set();
  for (const cluster of clusters) {
    for (const photo of cluster.photos) {
      if (!seenIds.has(photo.id)) {
        seenIds.add(photo.id);
        allPhotos.push(photo);
        if (allPhotos.length >= 4) break;
      }
    }
    if (allPhotos.length >= 4) break;
  }

  const remaining = totalPhotos - 4;
  const locationText = locations.join(' · ') || 'Various locations';

  return (
    <TouchableOpacity style={styles.clusterCard} onPress={() => onPress(year)} activeOpacity={0.9}>
      <PhotoCollage photos={allPhotos} remaining={remaining > 0 ? remaining : 0} avgDistanceMiles={null} />

      {/* Info Section */}
      <View style={styles.clusterInfo}>
        <View style={styles.clusterLocationRow}>
          <Text style={styles.clusterLocationText}>{year}</Text>
        </View>
        <View style={styles.clusterMeta}>
          <Text style={styles.clusterMetaText}>{locationText}</Text>
        </View>
        <View style={[styles.clusterMeta, { marginTop: 2 }]}>
          <Text style={styles.clusterMetaText}>{clusters.length} trips</Text>
          <Text style={styles.clusterMetaDot}>·</Text>
          <Text style={styles.clusterMetaText}>{totalPhotos} photos</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Collapsed card for unknown location cluster
export function CollapsedClusterCard({ cluster, onViewAll }) {
  return (
    <TouchableOpacity
      style={styles.collapsedCard}
      onPress={() => onViewAll(cluster)}
      activeOpacity={0.9}
    >
      <View style={styles.collapsedCardContent}>
        <Text style={styles.collapsedCardIcon}>📍</Text>
        <View style={styles.collapsedCardInfo}>
          <Text style={styles.collapsedCardTitle}>Unknown Location</Text>
          <Text style={styles.collapsedCardMeta}>
            {cluster.photos.length} photos · Tap to add location
          </Text>
        </View>
        <Text style={styles.collapsedCardArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default ClusterCard;
