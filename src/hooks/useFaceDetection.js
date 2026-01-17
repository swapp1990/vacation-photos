import { useState, useEffect, useCallback, useRef } from 'react';
import * as MediaLibrary from 'expo-media-library';

// FaceDetector requires development build - not available in Expo Go
let FaceDetector = null;
let faceDetectorAvailable = true;
try {
  FaceDetector = require('expo-face-detector');
} catch (e) {
  faceDetectorAvailable = false;
}

/**
 * Hook for background face detection in photos
 * Identifies photos with faces for prioritizing in cluster thumbnails
 */
export function useFaceDetection(clusters, loading) {
  const [photosWithFaces, setPhotosWithFaces] = useState({});
  const [faceDetectionRunning, setFaceDetectionRunning] = useState(false);
  const hasRunRef = useRef(false);

  const runBackgroundFaceDetection = useCallback(async () => {
    // Check if FaceDetector module is available
    if (!faceDetectorAvailable || !FaceDetector || !FaceDetector.detectFacesAsync) {
      console.log('Face detection skipped (requires development build)');
      return;
    }

    if (!clusters || clusters.length === 0) {
      return;
    }

    setFaceDetectionRunning(true);

    // Get a test photo to verify FaceDetector actually works
    const testCluster = clusters.find(c => c.photos.length > 0);
    if (!testCluster) {
      setFaceDetectionRunning(false);
      return;
    }

    // Test with first photo to see if native module works
    try {
      const testInfo = await MediaLibrary.getAssetInfoAsync(testCluster.photos[0].id);
      const testUri = testInfo.localUri || testInfo.uri;
      if (testUri) {
        await FaceDetector.detectFacesAsync(testUri, {
          mode: FaceDetector.FaceDetectorMode.fast,
        });
      }
    } catch (e) {
      // Native module not available - disable face detection for this session
      faceDetectorAvailable = false;
      console.log('Face detection disabled (native module not available in Expo Go)');
      setFaceDetectionRunning(false);
      return;
    }

    console.log('Starting background face detection...');

    const facesMap = {};
    let processedCount = 0;
    let photosWithFacesCount = 0;

    // Process photos from each cluster to find ones with faces
    for (const cluster of clusters) {
      // Only check first 10 photos per cluster for performance
      const photosToCheck = cluster.photos.slice(0, 10);

      for (const photo of photosToCheck) {
        if (facesMap[photo.id] !== undefined) continue; // Already checked

        try {
          const info = await MediaLibrary.getAssetInfoAsync(photo.id);
          const uri = info.localUri || info.uri;

          if (uri) {
            const result = await FaceDetector.detectFacesAsync(uri, {
              mode: FaceDetector.FaceDetectorMode.fast,
              detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
              runClassifications: FaceDetector.FaceDetectorClassifications.none,
            });

            const hasFaces = result.faces && result.faces.length > 0;
            facesMap[photo.id] = hasFaces;

            if (hasFaces) {
              photosWithFacesCount++;
            }
          }
        } catch (e) {
          // Silently skip errors for individual photos
          facesMap[photo.id] = false;
        }

        processedCount++;

        // Update state periodically to show progress
        if (processedCount % 20 === 0) {
          setPhotosWithFaces({ ...facesMap });
        }
      }
    }

    setPhotosWithFaces(facesMap);
    setFaceDetectionRunning(false);
    console.log(`Face detection complete: ${photosWithFacesCount} photos with faces out of ${processedCount} checked`);
  }, [clusters]);

  // Run face detection after initial load is complete
  useEffect(() => {
    if (!loading &&
        !faceDetectionRunning &&
        clusters &&
        clusters.length > 0 &&
        Object.keys(photosWithFaces).length === 0 &&
        !hasRunRef.current) {
      hasRunRef.current = true;
      runBackgroundFaceDetection();
    }
  }, [loading, clusters, faceDetectionRunning, photosWithFaces, runBackgroundFaceDetection]);

  return {
    photosWithFaces,
    faceDetectionRunning,
    runBackgroundFaceDetection,
  };
}

export default useFaceDetection;
