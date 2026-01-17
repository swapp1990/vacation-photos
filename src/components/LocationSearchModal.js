import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { searchLocations, createDebouncedSearch } from '../services/locationSearch';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import styles from '../styles/locationSearchModalStyles';

/**
 * Reusable location search modal component
 * @param {boolean} visible - Whether the modal is visible
 * @param {function} onClose - Called when modal is dismissed
 * @param {function} onLocationSelected - Called with selected location { displayName, latitude, longitude }
 * @param {string} title - Modal title (default: "Edit Location")
 * @param {string} currentLocation - Current location name to display
 */
export default function LocationSearchModal({
  visible,
  onClose,
  onLocationSelected,
  title = 'Edit Location',
  currentLocation = '',
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearchRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    debouncedSearchRef.current = createDebouncedSearch(400);
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedLocation(null);
      setIsSearching(false);
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

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
    inputRef.current?.focus();
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

  const handleSave = useCallback(() => {
    if (selectedLocation) {
      onLocationSelected(selectedLocation);
      onClose();
    }
  }, [selectedLocation, onLocationSelected, onClose]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

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
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, !selectedLocation && styles.saveButtonDisabled]}
            disabled={!selectedLocation}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[
              styles.saveButtonText,
              !selectedLocation && styles.saveButtonTextDisabled
            ]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        {/* Current location */}
        {currentLocation && (
          <View style={styles.currentLocationBanner}>
            <Text style={styles.currentLocationLabel}>Current:</Text>
            <Text style={styles.currentLocationText} numberOfLines={1}>
              {currentLocation}
            </Text>
          </View>
        )}

        {/* Search input */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color={colors.text.muted}
              style={styles.searchIcon}
            />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search for a city or place..."
              placeholderTextColor={colors.text.muted}
              value={searchQuery}
              onChangeText={handleSearchChange}
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
        </View>

        {/* Results */}
        <View style={styles.resultsSection}>
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          )}

          {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No locations found for "{searchQuery}"
              </Text>
            </View>
          )}

          {searchResults.length > 0 && (
            <FlatList
              style={styles.resultsList}
              contentContainerStyle={styles.resultsContent}
              data={searchResults}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderSearchResult}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          )}

          {selectedLocation && searchResults.length === 0 && (
            <View style={styles.selectedContainer}>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={colors.success}
                style={styles.selectedIcon}
              />
              <View style={styles.selectedTextContainer}>
                <Text style={styles.selectedLabel}>NEW LOCATION</Text>
                <Text style={styles.selectedName}>{selectedLocation.displayName}</Text>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
