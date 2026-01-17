import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EDITED_LOCATIONS_KEY = 'edited_cluster_locations';

/**
 * Hook for managing edited cluster locations
 * Allows users to override the auto-detected location names for vacation clusters
 */
export function useEditedLocations() {
  const [editedLocations, setEditedLocations] = useState({});

  // Load edited locations from storage on mount
  useEffect(() => {
    loadEditedLocations();
  }, []);

  const loadEditedLocations = async () => {
    try {
      const saved = await AsyncStorage.getItem(EDITED_LOCATIONS_KEY);
      if (saved) {
        setEditedLocations(JSON.parse(saved));
      }
    } catch (e) {
      console.log('Failed to load edited locations:', e);
    }
  };

  // Save edited location for a cluster
  const saveEditedLocation = useCallback(async (clusterId, locationName, location) => {
    try {
      const updated = {
        ...editedLocations,
        [clusterId]: { locationName, location },
      };
      setEditedLocations(updated);
      await AsyncStorage.setItem(EDITED_LOCATIONS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.log('Failed to save edited location:', e);
    }
  }, [editedLocations]);

  // Apply edited locations to a list of clusters
  const applyEditedLocations = useCallback((clustersList) => {
    if (!editedLocations || Object.keys(editedLocations).length === 0) return clustersList;
    return clustersList.map(cluster => {
      const edit = editedLocations[cluster.id];
      if (edit) {
        return {
          ...cluster,
          locationName: edit.locationName,
          location: edit.location || cluster.location,
        };
      }
      return cluster;
    });
  }, [editedLocations]);

  return {
    editedLocations,
    saveEditedLocation,
    applyEditedLocations,
  };
}

export default useEditedLocations;
