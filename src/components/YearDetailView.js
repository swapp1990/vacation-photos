import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { ClusterCard } from './ClusterCard';
import styles from '../styles/appStyles';

export default function YearDetailView({
  year,
  clusters,
  photosWithFaces,
  onBack,
  onViewCluster,
}) {
  const yearClusters = clusters.filter(c =>
    c.id !== 'cluster-unknown' && c.endDate.getFullYear() === year
  );
  const totalPhotos = yearClusters.reduce((sum, c) => sum + c.photos.length, 0);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="auto" />
        <View style={styles.tripHeader}>
          <TouchableOpacity onPress={onBack} style={styles.backButtonContainer}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.tripHeaderContent}>
            <Text style={styles.tripEmoji}>📅</Text>
            <Text style={styles.tripTagline}>MEMORIES FROM</Text>
            <Text style={styles.tripTitle}>{year}</Text>
            <Text style={styles.tripMeta}>
              {yearClusters.length} trips · {totalPhotos} photos
            </Text>
          </View>
        </View>
        <FlatList
          data={yearClusters}
          renderItem={({ item }) => (
            <ClusterCard
              cluster={item}
              onViewAll={onViewCluster}
              photosWithFaces={photosWithFaces}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.clusterList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No Trips</Text>
              <Text style={styles.emptyMessage}>
                No vacation photos found for {year}.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
