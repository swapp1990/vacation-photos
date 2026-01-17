import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseShareLink, fetchSharedVacation, fetchPreviewPhotos } from '../services/cloudKitService';
import { getUploadedVacations, getClusterKey, MAX_PHOTOS } from '../services/photoUploadService';

const SHARED_VACATIONS_KEY = 'shared_vacations';

/**
 * Hook for managing shared vacations
 * Handles receiving shared vacations via deep links and managing the list
 */
export function useSharedVacations() {
  const [sharedVacations, setSharedVacations] = useState([]);
  const [sharedVacationsDismissed, setSharedVacationsDismissed] = useState(false);
  const [uploadedVacations, setUploadedVacations] = useState({});

  // Load saved shared vacations from storage
  const loadSavedSharedVacations = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(SHARED_VACATIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        const vacations = parsed.map(sv => ({
          ...sv,
          receivedAt: sv.receivedAt ? new Date(sv.receivedAt) : null,
          vacation: sv.vacation ? {
            ...sv.vacation,
            startDate: sv.vacation.startDate ? new Date(sv.vacation.startDate) : null,
            endDate: sv.vacation.endDate ? new Date(sv.vacation.endDate) : null,
          } : null,
        }));
        setSharedVacations(vacations);
      }
    } catch (error) {
      console.log('Error loading saved shared vacations:', error);
    }
  }, []);

  // Load uploaded vacations mapping
  const loadUploadedVacations = useCallback(async () => {
    const uploaded = await getUploadedVacations();
    setUploadedVacations(uploaded);
  }, []);

  // Load on mount
  useEffect(() => {
    loadSavedSharedVacations();
    loadUploadedVacations();
  }, [loadSavedSharedVacations, loadUploadedVacations]);

  // Save shared vacations to storage
  const saveSharedVacations = useCallback(async (vacations) => {
    try {
      await AsyncStorage.setItem(SHARED_VACATIONS_KEY, JSON.stringify(vacations));
    } catch (error) {
      console.log('Error saving shared vacations:', error);
    }
  }, []);

  // Add a new shared vacation from deep link
  const addSharedVacation = useCallback(async (shareId) => {
    console.log('Adding shared vacation:', shareId);

    // Check if already exists
    if (sharedVacations.some(sv => sv.shareId === shareId)) {
      console.log('Shared vacation already exists');
      setSharedVacationsDismissed(false); // Show card again
      return;
    }

    try {
      // Fetch vacation metadata and preview photos in parallel
      const [vacation, previewPhotos] = await Promise.all([
        fetchSharedVacation(shareId),
        fetchPreviewPhotos(shareId),
      ]);

      const newSharedVacation = {
        shareId,
        vacation,
        previewPhotos,
        receivedAt: new Date(),
      };

      const updatedVacations = [newSharedVacation, ...sharedVacations];
      setSharedVacations(updatedVacations);
      setSharedVacationsDismissed(false); // Show card
      saveSharedVacations(updatedVacations);
    } catch (error) {
      console.log('Error adding shared vacation:', error);
    }
  }, [sharedVacations, saveSharedVacations]);

  // Remove a shared vacation
  const removeSharedVacation = useCallback((shareId) => {
    const updatedVacations = sharedVacations.filter(sv => sv.shareId !== shareId);
    setSharedVacations(updatedVacations);
    saveSharedVacations(updatedVacations);
  }, [sharedVacations, saveSharedVacations]);

  // Handle dismissing the shared vacations card
  const dismissSharedVacations = useCallback(() => {
    setSharedVacationsDismissed(true);
  }, []);

  // Get upload status for a cluster
  const getUploadStatus = useCallback((cluster) => {
    const clusterKey = getClusterKey(cluster);
    const entry = uploadedVacations[clusterKey];
    if (!entry) return null;
    // If total photos > MAX_PHOTOS, it's partial
    if (entry.totalPhotos > MAX_PHOTOS) return 'partial';
    return 'uploaded';
  }, [uploadedVacations]);

  // Setup deep link handling
  useEffect(() => {
    // Handle deep link when app is already open
    const handleDeepLink = (event) => {
      const shareId = parseShareLink(event.url);
      if (shareId) {
        console.log('Deep link received:', shareId);
        addSharedVacation(shareId);
      }
    };

    // Listen for incoming links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened via deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) {
        const shareId = parseShareLink(url);
        if (shareId) {
          console.log('App opened via deep link:', shareId);
          addSharedVacation(shareId);
        }
      }
    });

    return () => subscription.remove();
  }, [addSharedVacation]);

  return {
    sharedVacations,
    sharedVacationsDismissed,
    uploadedVacations,
    addSharedVacation,
    removeSharedVacation,
    dismissSharedVacations,
    getUploadStatus,
    loadUploadedVacations,
  };
}

export default useSharedVacations;
