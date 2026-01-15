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
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../styles/theme';

const APP_STORE_LINK = 'https://apps.apple.com/app/id6756803475';

export default function ShareModal({ visible, onClose, locationName, dateRange, photoCount }) {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Generate the share message
  const shareMessage = `Check out my vacation photos from ${locationName}! 📸\n\n${dateRange} · ${photoCount} photos\n\nDownload Vacation Photos to see more:\n${APP_STORE_LINK}`;

  useEffect(() => {
    if (visible) {
      loadContacts();
    } else {
      // Reset state when modal closes
      setSearchQuery('');
      setSelectedContact(null);
      setShowConfirmation(false);
    }
  }, [visible]);

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

      // Filter contacts that have phone numbers
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

  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
    setShowConfirmation(true);
  };

  const handleSendMessage = async () => {
    if (!selectedContact || !selectedContact.phoneNumbers?.[0]?.number) {
      Alert.alert('Error', 'No phone number available for this contact');
      return;
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const phoneNumber = selectedContact.phoneNumbers[0].number.replace(/[\s\-\(\)]/g, '');

    // Create WhatsApp URL
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(shareMessage)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);

      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        onClose();
      } else {
        Alert.alert(
          'WhatsApp Not Available',
          'WhatsApp is not installed on this device. Would you like to share via SMS instead?',
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

  const renderContact = ({ item }) => {
    const phoneNumber = item.phoneNumbers?.[0]?.number || 'No number';

    return (
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
          <Text style={styles.contactPhone}>{phoneNumber}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Confirmation Dialog
  if (showConfirmation && selectedContact) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowConfirmation(false)}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Confirm Share</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.confirmationContent}>
            <Text style={styles.confirmationLabel}>Sending to:</Text>
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

            <Text style={styles.confirmationLabel}>Message:</Text>
            <View style={styles.messagePreview}>
              <Text style={styles.messageText}>{shareMessage}</Text>
            </View>

            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <Text style={styles.sendButtonText}>Send via WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Contacts List
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
  // Confirmation screen styles
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
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  messagePreview: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  messageText: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 22,
  },
  sendButton: {
    backgroundColor: '#25D366', // WhatsApp green
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
