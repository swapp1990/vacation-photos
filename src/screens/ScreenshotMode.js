import { useState } from 'react';
import {
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import styles, { imageSize } from '../styles/appStyles';

const { width } = Dimensions.get('window');

// Mock trip data for screenshots
const MOCK_TRIPS = [
  {
    id: 'trip-1',
    locationName: 'Paris, France',
    photos: [
      { id: '1', uri: 'https://picsum.photos/seed/paris1/400/400' },
      { id: '2', uri: 'https://picsum.photos/seed/paris2/400/400' },
      { id: '3', uri: 'https://picsum.photos/seed/paris3/400/400' },
      { id: '4', uri: 'https://picsum.photos/seed/paris4/400/400' },
      { id: '5', uri: 'https://picsum.photos/seed/paris5/400/400' },
      { id: '6', uri: 'https://picsum.photos/seed/paris6/400/400' },
    ],
    startDate: new Date('2024-09-15'),
    endDate: new Date('2024-09-22'),
    days: 8,
    isVacation: true,
  },
  {
    id: 'trip-2',
    locationName: 'Tokyo, Japan',
    photos: [
      { id: '7', uri: 'https://picsum.photos/seed/tokyo1/400/400' },
      { id: '8', uri: 'https://picsum.photos/seed/tokyo2/400/400' },
      { id: '9', uri: 'https://picsum.photos/seed/tokyo3/400/400' },
      { id: '10', uri: 'https://picsum.photos/seed/tokyo4/400/400' },
      { id: '11', uri: 'https://picsum.photos/seed/tokyo5/400/400' },
    ],
    startDate: new Date('2024-07-01'),
    endDate: new Date('2024-07-10'),
    days: 10,
    isVacation: true,
  },
  {
    id: 'trip-3',
    locationName: 'Santorini, Greece',
    photos: [
      { id: '12', uri: 'https://picsum.photos/seed/greece1/400/400' },
      { id: '13', uri: 'https://picsum.photos/seed/greece2/400/400' },
      { id: '14', uri: 'https://picsum.photos/seed/greece3/400/400' },
      { id: '15', uri: 'https://picsum.photos/seed/greece4/400/400' },
    ],
    startDate: new Date('2024-05-20'),
    endDate: new Date('2024-05-25'),
    days: 6,
    isVacation: true,
  },
  {
    id: 'trip-4',
    locationName: 'New York, USA',
    photos: [
      { id: '16', uri: 'https://picsum.photos/seed/nyc1/400/400' },
      { id: '17', uri: 'https://picsum.photos/seed/nyc2/400/400' },
      { id: '18', uri: 'https://picsum.photos/seed/nyc3/400/400' },
    ],
    startDate: new Date('2024-03-10'),
    endDate: new Date('2024-03-14'),
    days: 5,
    isVacation: true,
  },
];

function formatDateRange(start, end) {
  const options = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', options);
  const year = start.getFullYear();

  if (startStr === endStr) {
    return `${startStr}, ${year}`;
  }
  return `${startStr} - ${endStr}, ${year}`;
}

function MockPhotoThumbnail({ uri, onPress, size = imageSize }) {
  return (
    <TouchableOpacity onPress={() => onPress(uri)}>
      <Image
        source={{ uri }}
        style={[styles.thumbnail, { width: size, height: size }]}
      />
    </TouchableOpacity>
  );
}

function MockClusterCard({ cluster, onPhotoPress, onViewAll }) {
  const previewPhotos = cluster.photos.slice(0, 4);
  const remaining = cluster.photos.length - 4;

  return (
    <View style={styles.clusterCard}>
      <View style={styles.clusterHeader}>
        <View>
          <View style={styles.clusterTitleRow}>
            {cluster.isVacation && <Text style={styles.vacationBadge}>Trip</Text>}
            <Text style={styles.clusterTitle}>
              {cluster.photos.length} photos
            </Text>
          </View>
          <Text style={styles.clusterDate}>
            {formatDateRange(cluster.startDate, cluster.endDate)}
            {cluster.days > 1 ? ` · ${cluster.days} days` : ''}
          </Text>
          <Text style={styles.clusterLocation}>
            📍 {cluster.locationName}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onViewAll(cluster)} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.clusterPreview}>
        {previewPhotos.map((photo, index) => (
          <View key={photo.id} style={styles.previewContainer}>
            <MockPhotoThumbnail
              uri={photo.uri}
              onPress={onPhotoPress}
              size={(width - 48) / 4 - 4}
            />
            {index === 3 && remaining > 0 && (
              <View style={styles.remainingOverlay}>
                <Text style={styles.remainingText}>+{remaining}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ScreenshotMode() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // For screenshot - tap to dismiss

  const totalPhotos = MOCK_TRIPS.reduce((sum, trip) => sum + trip.photos.length, 0);

  // Loading screen for screenshot - tap anywhere to dismiss
  // Matches the actual app's splash screen from App.js lines 570-587
  if (isLoading) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setIsLoading(false)}
        style={{ flex: 1 }}
      >
        <View style={styles.splashContainer}>
          <StatusBar style="light" />
          <Image
            source={require('../../assets/vacation-splash.png')}
            style={styles.splashImage}
            resizeMode="cover"
          />
          <View style={styles.splashOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.splashLoadingText}>Finding your vacation photos...</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Full screen image view
  if (selectedImage) {
    return (
      <View style={styles.fullscreenContainer}>
        <StatusBar style="light" />
        <View style={styles.fullscreenOverlay}>
          <SafeAreaView edges={['top']}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedImage(null)}
            >
              <Text style={styles.closeText}>Done</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
        <Image
          source={{ uri: selectedImage }}
          style={styles.fullImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  // Trip detail view
  if (selectedCluster) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <StatusBar style="auto" />
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelectedCluster(null)}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {selectedCluster.locationName}
            </Text>
            <Text style={styles.subtitle}>
              {formatDateRange(selectedCluster.startDate, selectedCluster.endDate)}
              {' · '}{selectedCluster.photos.length} photos
            </Text>
          </View>
          <FlatList
            key="photo-grid"
            data={selectedCluster.photos}
            renderItem={({ item }) => (
              <MockPhotoThumbnail uri={item.uri} onPress={setSelectedImage} />
            )}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.gallery}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Main view
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="auto" />
        <View style={styles.header}>
          <Image
            source={require('../../assets/app-logo-transparent.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>
            {MOCK_TRIPS.length} trips · {totalPhotos} photos (50+ miles from home)
          </Text>
        </View>
        <FlatList
          key="trips-list"
          data={MOCK_TRIPS}
          renderItem={({ item }) => (
            <MockClusterCard
              cluster={item}
              onPhotoPress={setSelectedImage}
              onViewAll={setSelectedCluster}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.clusterList}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
