import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { searchLocations, getCurrentLocation, createDebouncedSearch } from '../services/locationSearch';
import { colors } from '../styles/theme';
import styles from '../styles/locationSelectionStyles';

export default function LocationSelectionScreen({ onLocationSelected }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const debouncedSearchRef = useRef(null);

  useEffect(() => {
    debouncedSearchRef.current = createDebouncedSearch(400);
  }, []);

  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
    setSelectedLocation(null);

    if (text.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debouncedSearchRef.current?.(text, (results) => {
      setSearchResults(results);
      setIsSearching(false);
    });
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedLocation(null);
  }, []);

  const handleSelectResult = useCallback((location) => {
    Keyboard.dismiss();
    setSelectedLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      displayName: location.displayName,
    });
    setSearchQuery(location.displayName);
    setSearchResults([]);
  }, []);

  const handleUseCurrentLocation = useCallback(async () => {
    Keyboard.dismiss();
    setIsGettingLocation(true);
    try {
      const location = await getCurrentLocation();
      setSelectedLocation(location);
      setSearchQuery(location.displayName);
      setSearchResults([]);
    } catch (error) {
      console.log('Failed to get current location:', error.message);
    } finally {
      setIsGettingLocation(false);
    }
  }, []);

  const handleContinue = useCallback(() => {
    if (selectedLocation) {
      onLocationSelected(selectedLocation);
    }
  }, [selectedLocation, onLocationSelected]);

  const renderSearchResult = ({ item }) => {
    const isSelected = selectedLocation?.latitude === item.latitude &&
                       selectedLocation?.longitude === item.longitude;

    return (
      <TouchableOpacity
        style={[styles.resultItem, isSelected && styles.resultItemSelected]}
        onPress={() => handleSelectResult(item)}
        activeOpacity={0.7}
      >
        <Ionicons
          name="location-outline"
          size={20}
          color={colors.text.secondary}
          style={styles.resultIcon}
        />
        <View style={styles.resultTextContainer}>
          <Text style={styles.resultName}>{item.displayName}</Text>
          {item.fullName !== item.displayName && (
            <Text style={styles.resultFullName} numberOfLines={1}>
              {item.fullName}
            </Text>
          )}
        </View>
        {isSelected && (
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={colors.success}
            style={styles.selectedIndicator}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => {
    if (isSearching) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    if (searchQuery.length >= 2 && searchResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No locations found for "{searchQuery}"
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Where is home?</Text>
          <Text style={styles.subtitle}>
            We'll use this to find photos from your vacations - trips more than 50 miles away.
          </Text>
        </View>

        <View style={styles.searchSection}>
          <View style={[styles.searchContainer, isFocused && styles.searchContainerFocused]}>
            <Ionicons
              name="search"
              size={20}
              color={colors.text.muted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a city or address..."
              placeholderTextColor={colors.text.muted}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={handleClearSearch}
                style={styles.clearButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={20} color={colors.text.muted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.currentLocationButton,
              isGettingLocation && styles.currentLocationButtonLoading,
            ]}
            onPress={handleUseCurrentLocation}
            disabled={isGettingLocation}
            activeOpacity={0.7}
          >
            {isGettingLocation ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons
                  name="navigate"
                  size={20}
                  color={colors.primary}
                  style={styles.currentLocationIcon}
                />
                <Text style={styles.currentLocationText}>Use Current Location</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {searchResults.length > 0 && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>SEARCH RESULTS</Text>
              <View style={styles.dividerLine} />
            </View>

            <FlatList
              style={styles.resultsList}
              contentContainerStyle={styles.resultsContent}
              data={searchResults}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderSearchResult}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          </>
        )}

        {!searchResults.length && renderEmptyComponent()}

        {selectedLocation && searchResults.length === 0 && (
          <View style={styles.selectedLocationContainer}>
            <Ionicons
              name="home"
              size={24}
              color={colors.success}
              style={styles.selectedLocationIcon}
            />
            <View style={styles.selectedLocationTextContainer}>
              <Text style={styles.selectedLocationLabel}>HOME LOCATION</Text>
              <Text style={styles.selectedLocationName}>{selectedLocation.displayName}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedLocation && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedLocation}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.continueButtonText,
              !selectedLocation && styles.continueButtonTextDisabled,
            ]}
          >
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
