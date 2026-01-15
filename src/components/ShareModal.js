import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import * as MediaLibrary from 'expo-media-library';
import { StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../styles/theme';
import { shareVacationCluster, MAX_PHOTOS } from '../services/photoUploadService';
import { checkCloudKitAvailability } from '../services/cloudKitService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_PHOTO_SIZE = 80;

const APP_STORE_LINK = 'https://apps.apple.com/app/id6756803475';

// Screen states
const SCREEN = {
  CONTACTS: 'contacts',
  UPLOAD_CONFIRM: 'uploadConfirm',
  UPLOADING: 'uploading',
  SEND_CONFIRM: 'sendConfirm',
};

export default function ShareModal({ visible, onClose, cluster }) {
  const [screen, setScreen] = useState(SCREEN.CONTACTS);
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState({ phase: '', current: 0, total: 0 });
  const [shareResult, setShareResult] = useState(null);
  const [previewPhotoUris, setPreviewPhotoUris] = useState([]);

  // Derived values
  const locationName = cluster?.locationName || 'Vacation Photos';
  const photoCount = cluster?.photos?.length || 0;
  const photosToShare = Math.min(photoCount, MAX_PHOTOS);

  const formatDateRange = (start, end) => {
    if (!start || !end) return '';
    const options = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', options);
    const endStr = end.toLocaleDateString('en-US', options);
    const year = start.getFullYear();
    if (startStr === endStr) return `${startStr}, ${year}`;
    return `${startStr} - ${endStr}, ${year}`;
  };

  const dateRange = formatDateRange(cluster?.startDate, cluster?.endDate);

  useEffect(() => {
    if (visible) {
      setScreen(SCREEN.CONTACTS);
      setSelectedContact(null);
      setShareResult(null);
      setUploadProgress({ phase: '', current: 0, total: 0 });
      setPreviewPhotoUris([]);
      loadContacts();
      loadPreviewPhotos();
    } else {
      setSearchQuery('');
    }
  }, [visible]);

  // Load photo URIs for preview
  const loadPreviewPhotos = async () => {
    if (!cluster?.photos?.length) return;

    const previewPhotos = cluster.photos.slice(0, 8); // Show first 8 photos
    const uris = [];

    for (const photo of previewPhotos) {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(photo.id);
        if (info.localUri || info.uri) {
          uris.push(info.localUri || info.uri);
        }
      } catch (e) {
        // Skip failed photos
      }
    }

    setPreviewPhotoUris(uris);
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = contacts.filter(contact => {
        const name = contact.name?.toLowerCase() || '';
        return name.includes(query);
      });
      setFilteredContacts(filtered);
    }
  }, [searchQuery, contacts]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();

      if (status !== 'granted') {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      const contactsWithPhone = data.filter(
        contact => contact.phoneNumbers && contact.phoneNumbers.length > 0
      );

      setContacts(contactsWithPhone);
      setFilteredContacts(contactsWithPhone);
      setPermissionDenied(false);
    } catch (error) {
      console.log('Error loading contacts:', error);
      Alert.alert('Error', 'Could not load contacts');
    }
    setLoading(false);
  };

  const handleContactSelect = async (contact) => {
    setSelectedContact(contact);

    // Check CloudKit availability
    const availability = await checkCloudKitAvailability();
    console.log('CloudKit availability:', availability);

    if (!availability.available) {
      if (availability.status === 'noAccount') {
        Alert.alert(
          'iCloud Required',
          'Please sign in to iCloud in Settings to share photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      if (availability.status === 'moduleNotLoaded') {
        Alert.alert(
          'Feature Not Available',
          'Photo sharing requires a development build. The CloudKit module is not loaded.',
          [{ text: 'OK' }]
        );
        return;
      }
      // Show detailed error for debugging
      Alert.alert(
        'CloudKit Error',
        `Status: ${availability.status}\n${availability.error || 'Please try again later.'}`,
        [{ text: 'OK' }]
      );
      return;
    }

    setScreen(SCREEN.UPLOAD_CONFIRM);
  };

  const handleStartUpload = async () => {
    setScreen(SCREEN.UPLOADING);

    try {
      const result = await shareVacationCluster(cluster, (phase, current, total) => {
        setUploadProgress({ phase, current, total });
      });

      if (result.success) {
        setShareResult(result);
        setScreen(SCREEN.SEND_CONFIRM);
      } else {
        Alert.alert('Upload Failed', result.error || 'Failed to upload photos. Please try again.');
        setScreen(SCREEN.UPLOAD_CONFIRM);
      }
    } catch (error) {
      console.log('Upload error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setScreen(SCREEN.UPLOAD_CONFIRM);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedContact || !selectedContact.phoneNumbers?.[0]?.number || !shareResult) {
      Alert.alert('Error', 'Unable to send message');
      return;
    }

    const phoneNumber = selectedContact.phoneNumbers[0].number.replace(/[\s\-\(\)]/g, '');

    const shareMessage = `Check out my vacation photos from ${locationName}! 📸\n\n${dateRange} · ${shareResult.photosUploaded} photos\n\nView photos in the app:\n${shareResult.shareLink}\n\nDon't have the app? Download it here:\n${APP_STORE_LINK}`;

    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(shareMessage)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);

      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        onClose();
      } else {
        Alert.alert(
          'WhatsApp Not Available',
          'Would you like to share via SMS instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Send SMS',
              onPress: () => {
                const smsUrl = `sms:${phoneNumber}&body=${encodeURIComponent(shareMessage)}`;
                Linking.openURL(smsUrl);
                onClose();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.log('Error opening WhatsApp:', error);
      Alert.alert('Error', 'Could not open WhatsApp');
    }
  };

  const renderContact = ({ item }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleContactSelect(item)}
    >
      <View style={styles.contactAvatar}>
        <Text style={styles.contactAvatarText}>
          {item.name?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name || 'Unknown'}</Text>
        <Text style={styles.contactPhone}>{item.phoneNumbers?.[0]?.number || 'No number'}</Text>
      </View>
    </TouchableOpacity>
  );

  // Upload Confirmation Screen
  if (screen === SCREEN.UPLOAD_CONFIRM && selectedContact) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setScreen(SCREEN.CONTACTS)}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Share Photos</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.confirmationContent} showsVerticalScrollIndicator={false}>
            {/* Photo Preview */}
            <Text style={styles.previewLabel}>Photos to share</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoPreviewScroll}
              contentContainerStyle={styles.photoPreviewContainer}
            >
              {previewPhotoUris.map((uri, index) => (
                <View key={index} style={styles.previewPhotoWrapper}>
                  <Image source={{ uri }} style={styles.previewPhoto} />
                  {index === previewPhotoUris.length - 1 && photosToShare > previewPhotoUris.length && (
                    <View style={styles.previewMoreOverlay}>
                      <Text style={styles.previewMoreText}>+{photosToShare - previewPhotoUris.length}</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            {/* Trip Info Card */}
            <View style={styles.shareInfoCard}>
              <Text style={styles.shareInfoTitle}>{locationName}</Text>
              <Text style={styles.shareInfoSubtitle}>{dateRange}</Text>
              <View style={styles.shareInfoDivider} />
              <Text style={styles.shareInfoDetail}>
                {photosToShare} photo{photosToShare !== 1 ? 's' : ''} will be uploaded
              </Text>
              {photoCount > MAX_PHOTOS && (
                <Text style={styles.shareInfoWarning}>
                  (Limited to {MAX_PHOTOS} photos)
                </Text>
              )}
            </View>

            <Text style={styles.confirmationLabel}>Sharing with:</Text>
            <View style={styles.recipientCard}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>
                  {selectedContact.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{selectedContact.name}</Text>
                <Text style={styles.contactPhone}>
                  {selectedContact.phoneNumbers?.[0]?.number}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.uploadButton} onPress={handleStartUpload}>
              <Text style={styles.uploadButtonText}>Upload & Share</Text>
            </TouchableOpacity>

            <Text style={styles.uploadNote}>
              Photos will be uploaded to iCloud and a link will be sent via WhatsApp
            </Text>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // Uploading Screen
  if (screen === SCREEN.UPLOADING) {
    const progressPercent = uploadProgress.total > 0
      ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
      : 0;

    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={{ width: 60 }} />
            <Text style={styles.headerTitle}>Uploading</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.uploadingContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.uploadingTitle}>
              {uploadProgress.phase === 'preparing' ? 'Preparing photos...' : 'Uploading photos...'}
            </Text>
            <Text style={styles.uploadingProgress}>
              {uploadProgress.current} of {uploadProgress.total}
            </Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.uploadingNote}>Please keep the app open</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Send Confirmation Screen
  if (screen === SCREEN.SEND_CONFIRM && shareResult && selectedContact) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelButton}>Done</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Ready to Share</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.confirmationContent}>
            <View style={styles.successCard}>
              <Text style={styles.successEmoji}>✅</Text>
              <Text style={styles.successTitle}>Upload Complete!</Text>
              <Text style={styles.successSubtitle}>
                {shareResult.photosUploaded} photos uploaded successfully
              </Text>
            </View>

            <Text style={styles.confirmationLabel}>Send link to:</Text>
            <View style={styles.recipientCard}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>
                  {selectedContact.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{selectedContact.name}</Text>
                <Text style={styles.contactPhone}>
                  {selectedContact.phoneNumbers?.[0]?.number}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <Text style={styles.sendButtonText}>Send via WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Contacts List Screen (default)
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share Trip</Text>
          <View style={{ width: 60 }} />
        </View>

        {permissionDenied ? (
          <View style={styles.permissionDenied}>
            <Text style={styles.permissionIcon}>📇</Text>
            <Text style={styles.permissionTitle}>Contacts Access Required</Text>
            <Text style={styles.permissionText}>
              To share with your contacts, please allow access in Settings.
            </Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => Linking.openSettings()}
            >
              <Text style={styles.settingsButtonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : (
          <>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search contacts..."
                placeholderTextColor={colors.text.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredContacts}
              renderItem={renderContact}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.contactsList}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No contacts found</Text>
                </View>
              }
            />
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text.primary,
  },
  cancelButton: {
    ...typography.body,
    color: colors.primary,
  },
  backButton: {
    ...typography.body,
    color: colors.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text.primary,
  },
  contactsList: {
    paddingHorizontal: spacing.lg,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  contactAvatarText: {
    ...typography.headline,
    color: '#fff',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  contactPhone: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.muted,
    marginTop: spacing.md,
  },
  permissionDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    ...typography.title2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  permissionText: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  settingsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  settingsButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyStateText: {
    ...typography.body,
    color: colors.text.muted,
  },
  // Confirmation screens
  confirmationContent: {
    flex: 1,
    padding: spacing.lg,
  },
  confirmationLabel: {
    ...typography.caption,
    color: colors.text.muted,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  // Photo preview
  previewLabel: {
    ...typography.subhead,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  photoPreviewScroll: {
    marginBottom: spacing.lg,
    marginHorizontal: -spacing.lg,
  },
  photoPreviewContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  previewPhotoWrapper: {
    width: PREVIEW_PHOTO_SIZE,
    height: PREVIEW_PHOTO_SIZE,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  previewPhoto: {
    width: '100%',
    height: '100%',
  },
  previewMoreOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewMoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  // Share info card
  shareInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  shareInfoEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  shareInfoTitle: {
    ...typography.title2,
    color: colors.text.primary,
    textAlign: 'center',
  },
  shareInfoSubtitle: {
    ...typography.body,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  shareInfoDivider: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  shareInfoDetail: {
    ...typography.body,
    color: colors.text.primary,
  },
  shareInfoWarning: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  uploadButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  uploadNote: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  // Uploading screen
  uploadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  uploadingTitle: {
    ...typography.title2,
    color: colors.text.primary,
    marginTop: spacing.xl,
  },
  uploadingProgress: {
    ...typography.body,
    color: colors.text.muted,
    marginTop: spacing.sm,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  uploadingNote: {
    ...typography.caption,
    color: colors.text.muted,
    marginTop: spacing.lg,
  },
  // Success screen
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.title2,
    color: colors.text.primary,
  },
  successSubtitle: {
    ...typography.body,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  sendButton: {
    backgroundColor: '#25D366',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  sendButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
