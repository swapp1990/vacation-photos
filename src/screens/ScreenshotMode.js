import { useState } from 'react';
import {
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/appStyles';
import { colors, spacing, typography, borderRadius } from '../styles/theme';

const { width } = Dimensions.get('window');

// High-quality vacation photos from Lorem Picsum (specific IDs that look like travel photos)
const MOCK_TRIPS = [
  {
    id: 'trip-1',
    locationName: 'Maui, Hawaii',
    photos: [
      { id: '1', uri: 'https://picsum.photos/id/1036/600/600' }, // Beach/water
      { id: '2', uri: 'https://picsum.photos/id/1040/400/400' }, // Sunset landscape
      { id: '3', uri: 'https://picsum.photos/id/1051/400/400' }, // Nature
      { id: '4', uri: 'https://picsum.photos/id/1043/400/400' }, // Coastal
      { id: '5', uri: 'https://picsum.photos/id/1044/400/400' },
      { id: '6', uri: 'https://picsum.photos/id/1047/400/400' },
      { id: '7', uri: 'https://picsum.photos/id/1053/400/400' },
      { id: '8', uri: 'https://picsum.photos/id/1057/400/400' },
      { id: '9', uri: 'https://picsum.photos/id/1058/400/400' },
    ],
    startDate: new Date('2024-03-15'),
    endDate: new Date('2024-03-22'),
    days: 8,
    distanceMiles: 2847,
  },
  {
    id: 'trip-2',
    locationName: 'Tokyo, Japan',
    photos: [
      { id: '10', uri: 'https://picsum.photos/id/1029/600/600' }, // Mountain/nature
      { id: '11', uri: 'https://picsum.photos/id/164/400/400' },  // Architecture
      { id: '12', uri: 'https://picsum.photos/id/1015/400/400' }, // River/nature
      { id: '13', uri: 'https://picsum.photos/id/1059/400/400' },
      { id: '14', uri: 'https://picsum.photos/id/1067/400/400' },
      { id: '15', uri: 'https://picsum.photos/id/1069/400/400' },
      { id: '16', uri: 'https://picsum.photos/id/1060/400/400' },
      { id: '17', uri: 'https://picsum.photos/id/1061/400/400' },
      { id: '18', uri: 'https://picsum.photos/id/1062/400/400' },
      { id: '19', uri: 'https://picsum.photos/id/1063/400/400' },
      { id: '20', uri: 'https://picsum.photos/id/1064/400/400' },
      { id: '21', uri: 'https://picsum.photos/id/1065/400/400' },
    ],
    startDate: new Date('2024-04-01'),
    endDate: new Date('2024-04-08'),
    days: 8,
    distanceMiles: 5280,
  },
  {
    id: 'trip-3',
    locationName: 'Rome, Italy',
    photos: [
      { id: '22', uri: 'https://picsum.photos/id/1042/600/600' }, // Coastal cliffs
      { id: '23', uri: 'https://picsum.photos/id/1039/400/400' }, // Architecture
      { id: '24', uri: 'https://picsum.photos/id/1028/400/400' }, // Cityscape
      { id: '25', uri: 'https://picsum.photos/id/1005/400/400' },
      { id: '26', uri: 'https://picsum.photos/id/1006/400/400' },
      { id: '27', uri: 'https://picsum.photos/id/1035/400/400' },
    ],
    startDate: new Date('2023-06-03'),
    endDate: new Date('2023-06-10'),
    days: 8,
    distanceMiles: 4920,
  },
  {
    id: 'trip-4',
    locationName: 'Banff, Canada',
    photos: [
      { id: '28', uri: 'https://picsum.photos/id/1018/600/600' }, // Mountain lake
      { id: '29', uri: 'https://picsum.photos/id/1019/400/400' }, // Forest
      { id: '30', uri: 'https://picsum.photos/id/1011/400/400' }, // Mountains
      { id: '31', uri: 'https://picsum.photos/id/1016/400/400' },
      { id: '32', uri: 'https://picsum.photos/id/1020/400/400' },
    ],
    startDate: new Date('2023-08-15'),
    endDate: new Date('2023-08-20'),
    days: 6,
    distanceMiles: 1350,
  },
];

function formatDateRange(start, end) {
  const options = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', options);
  const year = start.getFullYear();
  return `${startStr} - ${endStr}, ${year}`;
}

function getDistanceEmoji(miles) {
  if (miles < 100) return '🚗';
  if (miles < 500) return '🚂';
  if (miles < 1500) return '✈️';
  if (miles < 5000) return '🌍';
  return '🚀';
}

// Photo collage matching real app's ClusterCard layout
function PhotoCollage({ photos, remaining, distanceMiles }) {
  return (
    <View style={styles.clusterCollage}>
      {/* Main large photo */}
      <View style={styles.clusterMainPhoto}>
        <Image source={{ uri: photos[0].uri }} style={styles.clusterMainPhotoImage} />
      </View>
      {/* Side photos */}
      {photos.length > 1 && (
        <View style={styles.clusterSidePhotos}>
          {photos.slice(1, 4).map((photo, index) => (
            <View
              key={photo.id}
              style={[
                styles.clusterSidePhoto,
                index === Math.min(photos.length - 2, 2) && styles.clusterSidePhotoLast,
              ]}
            >
              <Image source={{ uri: photo.uri }} style={styles.clusterSidePhotoImage} />
              {index === 2 && remaining > 0 && (
                <View style={styles.clusterMoreOverlay}>
                  <Text style={styles.clusterMoreText}>+{remaining}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
      {/* Distance badge */}
      {distanceMiles && (
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceBadgeEmoji}>{getDistanceEmoji(distanceMiles)}</Text>
          <Text style={styles.distanceBadgeText}>{distanceMiles.toLocaleString()} mi</Text>
        </View>
      )}
    </View>
  );
}

// Trip card matching real app's ClusterCard
function MockClusterCard({ trip }) {
  const photos = trip.photos.slice(0, 4);
  const remaining = trip.photos.length - 4;
  const dateRange = formatDateRange(trip.startDate, trip.endDate);

  return (
    <View style={styles.clusterCard}>
      <PhotoCollage photos={photos} remaining={remaining} distanceMiles={trip.distanceMiles} />
      <View style={styles.clusterInfo}>
        <View style={styles.clusterTopRow}>
          <Text style={styles.clusterLocationText} numberOfLines={1}>{trip.locationName}</Text>
          <View style={styles.shareButton}>
            <Ionicons name="arrow-redo" size={20} color={colors.primary} />
          </View>
        </View>
        <View style={styles.clusterMeta}>
          <Text style={styles.clusterMetaText}>{trip.photos.length} photos</Text>
          <Text style={styles.clusterMetaDot}>·</Text>
          <Text style={styles.clusterMetaText}>{dateRange}</Text>
        </View>
      </View>
    </View>
  );
}

// Trip detail view (photo grid)
function TripDetail({ trip, onBack }) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="auto" />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{trip.locationName}</Text>
          <Text style={styles.subtitle}>
            {formatDateRange(trip.startDate, trip.endDate)} · {trip.photos.length} photos
          </Text>
        </View>
        <FlatList
          data={trip.photos}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item.uri }}
              style={{
                width: (width - 8) / 3,
                height: (width - 8) / 3,
                margin: 1,
              }}
            />
          )}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={{ padding: 2 }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function ScreenshotMode() {
  const [selectedTrip, setSelectedTrip] = useState(null);

  const totalPhotos = MOCK_TRIPS.reduce((sum, trip) => sum + trip.photos.length, 0);

  if (selectedTrip) {
    return <TripDetail trip={selectedTrip} onBack={() => setSelectedTrip(null)} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="auto" />
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: spacing.md,
            }}>
              <Ionicons name="cube" size={22} color="white" />
            </View>
            <Text style={typography.title}>Vacations</Text>
          </View>
          <Text style={[typography.caption, { color: colors.text.muted, marginLeft: 52 }]}>
            {MOCK_TRIPS.length} trips · {totalPhotos} photos
          </Text>
        </View>
        <FlatList
          data={MOCK_TRIPS}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelectedTrip(item)} activeOpacity={0.9}>
              <MockClusterCard trip={item} />
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
