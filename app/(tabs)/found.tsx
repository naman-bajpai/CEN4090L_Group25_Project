import Page from '@/components/Page';
import Field from '@/components/TextField';
import { claimItem, createItem, getItemImageUrl, getItems } from '@/lib/api';
import type { Tables } from '@/lib/database.types';
import { useAuth } from '@/lib/session';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ItemWithProfile = Tables<'items'> & {
  profiles: { full_name: string | null; avatar_path: string | null } | null;
};

function FoundItemCard({
  item,
  session,
  onPress,
}: {
  item: ItemWithProfile;
  session: any;
  onPress: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (item.image_path) {
      getItemImageUrl(item.image_path).then(setImageUrl);
    }
  }, [item.image_path]);

  return (
    <View style={styles.itemCard}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.itemImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.itemImagePlaceholder}>
          <Ionicons name="image-outline" size={40} color="#D1D5DB" />
        </View>
      )}
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleContainer}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              item.status === 'open' && styles.statusOpen,
              item.status === 'claimed' && styles.statusClaimed,
              item.status === 'closed' && styles.statusClosed,
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.itemFooter}>
          {item.hub && (
            <View style={[styles.itemMeta, styles.hubMeta]}>
              <Ionicons name="storefront" size={14} color="#10B981" />
              <Text style={[styles.itemMetaText, styles.hubMetaText]}>
                {item.hub}
              </Text>
            </View>
          )}
          {item.location && (
            <View style={styles.itemMeta}>
              <Ionicons name="location" size={14} color="#6B7280" />
              <Text style={styles.itemMetaText}>{item.location}</Text>
            </View>
          )}
          {item.color && (
            <View style={styles.itemMeta}>
              <Ionicons name="color-palette" size={14} color="#6B7280" />
              <Text style={styles.itemMetaText}>{item.color}</Text>
            </View>
          )}
          {item.profiles?.full_name && (
            <View style={styles.itemMeta}>
              <Ionicons name="person" size={14} color="#6B7280" />
              <Text style={styles.itemMetaText}>{item.profiles.full_name}</Text>
            </View>
          )}
        </View>

        {item.status === 'open' && session && (
          <TouchableOpacity
            style={styles.claimButton}
            onPress={(e) => {
              e.stopPropagation();
              onPress();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.claimButtonText}>Claim This Item</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function FoundItemsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<ItemWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'claimed'>('all');

  const [selectedItem, setSelectedItem] = useState<ItemWithProfile | null>(null);
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [location, setLocation] = useState('');
  const [whenFound, setWhenFound] = useState('');

  const [showWhenFoundPicker, setShowWhenFoundPicker] = useState(false);
  const [selectedHub, setSelectedHub] = useState<
    'Strozier Library' | 'Student Union' | 'Dirac Library' | null
  >(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [imageUri, setImageUri] = useState<string | null>(null);

  const hubs: Array<
    'Strozier Library' | 'Student Union' | 'Dirac Library'
  > = ['Strozier Library', 'Student Union', 'Dirac Library'];

  // ✅ SAME FIX AS lost.tsx: close overlays on blur/unmount (iOS especially)
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setShowWhenFoundPicker(false);
        setClaimModalVisible(false);
        setShowForm(false);
      };
    }, [])
  );

  // ✅ extra safety: if form closes, picker must close too
  useEffect(() => {
    if (!showForm) setShowWhenFoundPicker(false);
  }, [showForm]);

  const loadItems = async () => {
    try {
      const filters: any = { type: 'found' };
      if (filter !== 'all') filters.status = filter;

      const data = await getItems(filters);
      setItems(data as ItemWithProfile[]);
    } catch (error) {
      console.error('Failed to load items:', error);
      Alert.alert('Error', 'Failed to load found items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadItems();
  };

  const handleClaim = async () => {
    if (!selectedItem || !session) return;

    setClaiming(true);
    try {
      await claimItem(selectedItem.id);
      Alert.alert('Success', 'Item claimed successfully!');
      setClaimModalVisible(false);
      setSelectedItem(null);
      loadItems();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to claim item');
    } finally {
      setClaiming(false);
    }
  };

  // Image picker functions
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'We need camera roll permissions to upload images'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera permissions to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const showImagePicker = () => {
    Alert.alert('Add Photo', 'Choose an option', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Photo Library', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const resetForm = () => {
    // ✅ ensure picker never survives
    setShowWhenFoundPicker(false);

    setTitle('');
    setDescription('');
    setColor('');
    setLocation('');
    setWhenFound('');
    setImageUri(null);
    setSelectedHub(null);
    setShowForm(false);
  };

  // ✅ FIX: open picker on next frame so it appears on top reliably
  const openWhenFoundPicker = () => {
    if (whenFound) setSelectedDate(new Date(whenFound));
    else setSelectedDate(new Date());

    requestAnimationFrame(() => setShowWhenFoundPicker(true));
  };

  const handleDateConfirm = () => {
    const isoDate = selectedDate.toISOString().split('T')[0];
    setWhenFound(isoDate);
    setShowWhenFoundPicker(false);
  };

  const handleSubmit = async () => {
    if (!session) {
      Alert.alert('Error', 'You must be logged in to post a found item');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Missing Info', 'Please enter a title for the found item');
      return;
    }

    setSubmitting(true);
    try {
      await createItem(
        {
          user_id: session.user.id,
          type: 'found',
          title: title.trim(),
          description: description.trim() || null,
          color: color.trim() || null,
          location: location.trim() || null,
          when_lost: whenFound ? new Date(whenFound).toISOString() : null,
          status: 'open',
          hub: selectedHub,
        },
        imageUri || undefined
      );

      Alert.alert('Success', 'Found item posted successfully!');
      resetForm();
      loadItems();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to post found item');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#782F40" />
      </View>
    );
  }

  return (
    <Page>
      <View style={styles.container}>
        <StatusBar style="dark" />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Found Items</Text>
              <Text style={styles.subtitle}>
                {items.length} item{items.length !== 1 ? 's' : ''} found
              </Text>
            </View>
            {session && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowForm(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
              onPress={() => setFilter('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, filter === 'open' && styles.filterButtonActive]}
              onPress={() => setFilter('open')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, filter === 'open' && styles.filterTextActive]}>
                Open
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, filter === 'claimed' && styles.filterButtonActive]}
              onPress={() => setFilter('claimed')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === 'claimed' && styles.filterTextActive,
                ]}
              >
                Claimed
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyText}>No found items</Text>
              <Text style={styles.emptySubtext}>
                {session ? 'Be the first to post a found item!' : 'Check back later!'}
              </Text>
            </View>
          ) : (
            <View style={styles.itemsContainer}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/(tabs)/item/${item.id}`)}
                  activeOpacity={0.7}
                >
                  <FoundItemCard
                    item={item}
                    session={session}
                    onPress={() => {
                      setSelectedItem(item);
                      setClaimModalVisible(true);
                    }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Claim Modal */}
        <Modal
          visible={claimModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setClaimModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedItem && (
                <>
                  <Text style={styles.modalTitle}>Claim Item</Text>
                  <Text style={styles.modalItemTitle}>{selectedItem.title}</Text>

                  {selectedItem.description && (
                    <Text style={styles.modalDescription}>{selectedItem.description}</Text>
                  )}

                  <View style={styles.modalDetails}>
                    {selectedItem.location && (
                      <Text style={styles.modalDetailText}>
                        <Ionicons name="location" size={16} /> {selectedItem.location}
                      </Text>
                    )}
                    {selectedItem.color && (
                      <Text style={styles.modalDetailText}>
                        <Ionicons name="color-palette" size={16} /> {selectedItem.color}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.modalQuestion}>
                    Is this your item? Claiming will notify the finder.
                  </Text>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonCancel]}
                      onPress={() => setClaimModalVisible(false)}
                    >
                      <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonConfirm]}
                      onPress={handleClaim}
                      disabled={claiming}
                    >
                      {claiming ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.modalButtonTextConfirm}>Claim</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Post Found Item Form Modal */}
        <Modal visible={showForm} animationType="slide" transparent={false} onRequestClose={resetForm}>
          <KeyboardAvoidingView
            style={styles.formModalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={[styles.formModalHeader, { paddingTop: insets.top + 16 }]}>
              <View style={styles.formModalHeaderContent}>
                <View style={styles.formModalTitleContainer}>
                  <View style={styles.formModalIconContainer}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  </View>
                  <View>
                    <Text style={styles.formModalTitle}>Post Found Item</Text>
                    <Text style={styles.formModalSubtitle}>Help reunite items with their owners</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={resetForm}
                  style={styles.formCloseButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.formModalContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formModalContentContainer}
              keyboardShouldPersistTaps="handled"
            >
              {/* Image Section */}
              <View style={styles.formSection}>
                <View style={styles.formSectionTitleContainer}>
                  <Ionicons name="image" size={18} color="#10B981" />
                  <Text style={styles.formSectionTitle}>Photo</Text>
                </View>
                <Text style={styles.formSectionSubtitle}>Add a photo to help identify the item</Text>

                {imageUri ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    <View style={styles.imageActions}>
                      <TouchableOpacity style={styles.imageActionButton} onPress={showImagePicker}>
                        <Ionicons name="camera" size={18} color="#10B981" />
                        <Text style={styles.imageActionText}>Change</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.imageActionButton, styles.removeButton]}
                        onPress={() => setImageUri(null)}
                      >
                        <Ionicons name="trash" size={18} color="#EF4444" />
                        <Text style={[styles.imageActionText, styles.removeButtonText]}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.imagePickerButton}
                    onPress={showImagePicker}
                    activeOpacity={0.7}
                  >
                    <View style={styles.imagePickerIconContainer}>
                      <Ionicons name="camera-outline" size={32} color="#10B981" />
                    </View>
                    <Text style={styles.imagePickerText}>Add Photo</Text>
                    <Text style={styles.imagePickerSubtext}>
                      Optional - Tap to add from camera or gallery
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Basic Information */}
              <View style={styles.formSection}>
                <View style={styles.formSectionTitleContainer}>
                  <Ionicons name="information-circle" size={18} color="#10B981" />
                  <Text style={styles.formSectionTitle}>Basic Information</Text>
                </View>

                <Field
                  label="Item Title"
                  placeholder="e.g., Black Wallet, iPhone 13"
                  value={title}
                  onChangeText={setTitle}
                  autoCapitalize="words"
                  icon="pricetag"
                />

                <Field
                  label="Description"
                  placeholder="Describe the item you found..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  style={styles.textArea}
                  icon="text"
                />
              </View>

              {/* Additional Details */}
              <View style={styles.formSection}>
                <View style={styles.formSectionTitleContainer}>
                  <Ionicons name="list" size={18} color="#10B981" />
                  <Text style={styles.formSectionTitle}>Additional Details</Text>
                </View>
                <Text style={styles.formSectionSubtitle}>
                  These details help owners identify their item
                </Text>

                <Field
                  label="Color"
                  placeholder="e.g., Red, Blue, Black"
                  value={color}
                  onChangeText={setColor}
                  icon="color-palette"
                />

                <Field
                  label="Location Found"
                  placeholder="Where did you find it?"
                  value={location}
                  onChangeText={setLocation}
                  icon="location"
                />

                <TouchableOpacity activeOpacity={0.7} onPress={openWhenFoundPicker}>
                  <Field
                    label="When Found"
                    placeholder="Select date"
                    value={whenFound ? new Date(whenFound).toLocaleDateString() : ''}
                    editable={false}
                    icon="calendar"
                    rightAccessory={<Ionicons name="chevron-down" size={18} color="#6B7280" />}
                  />
                </TouchableOpacity>

                {/* Hub Selection */}
                <View style={styles.hubSection}>
                  <View style={styles.formSectionTitleContainer}>
                    <Ionicons name="storefront" size={18} color="#10B981" />
                    <Text style={styles.formSectionTitle}>Hub</Text>
                  </View>
                  <Text style={styles.formSectionSubtitle}>
                    Select which hub you returned this item to
                  </Text>

                  <View style={styles.hubOptions}>
                    {hubs.map((hub) => (
                      <TouchableOpacity
                        key={hub}
                        style={[styles.hubOption, selectedHub === hub && styles.hubOptionSelected]}
                        onPress={() => setSelectedHub(hub)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={selectedHub === hub ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={selectedHub === hub ? '#10B981' : '#9CA3AF'}
                        />
                        <Text
                          style={[
                            styles.hubOptionText,
                            selectedHub === hub && styles.hubOptionTextSelected,
                          ]}
                        >
                          {hub}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Submit Button */}
              <View style={styles.submitContainer}>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (submitting || !title.trim()) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting || !title.trim()}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" style={styles.submitLoader} />
                      <Text style={styles.submitButtonText}>Posting...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>Post Found Item</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={styles.requiredNote}>* Required fields must be filled</Text>
              </View>
            </ScrollView>

            {/* ✅ Date Picker Overlay INSIDE the form modal (not a nested Modal) */}
            {showWhenFoundPicker && (
              <View style={styles.datePickerOverlay}>
                <TouchableOpacity
                  style={styles.datePickerBackdrop}
                  activeOpacity={1}
                  onPress={() => setShowWhenFoundPicker(false)}
                />
                <View style={styles.dateModalCard}>
                  <View style={styles.dateModalHeader}>
                    <Text style={styles.dateModalTitle}>Select Date Found</Text>
                    <TouchableOpacity
                      onPress={() => setShowWhenFoundPicker(false)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.datePickerWrapper}>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      maximumDate={new Date()}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      themeVariant="light"
                      textColor="#111827"
                      onChange={(event: any, date?: Date) => {
                        if (Platform.OS === 'android') {
                          setShowWhenFoundPicker(false);
                          if (event.type === 'set' && date) {
                            setSelectedDate(date);
                            setWhenFound(date.toISOString().split('T')[0]);
                          }
                          return;
                        }

                        // iOS
                        if (date) setSelectedDate(date);
                        if (event.type === 'dismissed') setShowWhenFoundPicker(false);
                      }}
                    />
                  </View>

                  {Platform.OS === 'ios' && (
                    <View style={styles.dateActions}>
                      <TouchableOpacity
                        style={[styles.dateActionBtn, styles.dateCancelBtn]}
                        onPress={() => setShowWhenFoundPicker(false)}
                      >
                        <Text style={[styles.dateActionText, styles.dateCancelText]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.dateActionBtn, styles.dateConfirmBtn]}
                        onPress={handleDateConfirm}
                      >
                        <Text style={[styles.dateActionText, styles.dateConfirmText]}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  scrollView: { flex: 1 },
  itemsContainer: {
    padding: 16,
    gap: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  itemImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  itemTitleContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 24,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusOpen: { backgroundColor: '#D1FAE5' },
  statusClaimed: { backgroundColor: '#FEF3C7' },
  statusClosed: { backgroundColor: '#FEE2E2' },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  itemFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemMetaText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  hubMeta: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  hubMetaText: {
    color: '#10B981',
    fontWeight: '600',
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  claimButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    marginTop: 64,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 16 },
  modalItemTitle: { fontSize: 20, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  modalDescription: { fontSize: 14, color: '#666', marginBottom: 16 },
  modalDetails: { marginBottom: 16 },
  modalDetailText: { fontSize: 14, color: '#666', marginBottom: 4 },
  modalQuestion: { fontSize: 14, color: '#1a1a1a', marginBottom: 20, fontWeight: '500' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonCancel: { backgroundColor: '#f0f0f0' },
  modalButtonConfirm: { backgroundColor: '#10B981' },
  modalButtonTextCancel: { color: '#1a1a1a', fontWeight: '600' },
  modalButtonTextConfirm: { color: '#fff', fontWeight: '600' },

  formModalContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  formModalHeader: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formModalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  formModalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  formModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  formCloseButton: { padding: 4 },

  formModalContent: { flex: 1 },
  formModalContentContainer: { padding: 20, paddingBottom: 100 },
  formSection: { marginBottom: 32 },
  formSectionTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  formSectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', letterSpacing: -0.3 },
  formSectionSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 18 },

  textArea: { minHeight: 120, textAlignVertical: 'top', paddingTop: 14 },

  imagePickerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    backgroundColor: '#FAFAFA',
    gap: 12,
  },
  imagePickerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: { color: '#1F2937', fontWeight: '600', fontSize: 16 },
  imagePickerSubtext: { color: '#6B7280', fontSize: 13, textAlign: 'center', marginTop: -4 },

  imagePreviewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  previewImage: { width: '100%', height: 240, backgroundColor: '#F3F4F6' },

  imageActions: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  imageActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  removeButton: { backgroundColor: '#FEF2F2' },
  imageActionText: { color: '#10B981', fontWeight: '600', fontSize: 14 },
  removeButtonText: { color: '#EF4444' },

  submitContainer: { marginTop: 8, marginBottom: 20 },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  submitLoader: { marginRight: 0 },
  requiredNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 12 },

  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
  },
  datePickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dateModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  dateModalBackdropTouchable: { flex: 1 },
  dateModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  dateModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  dateModalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  datePickerWrapper: { alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  dateActions: { marginTop: 12, flexDirection: 'row', gap: 12 },
  dateActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dateCancelBtn: { backgroundColor: '#F3F4F6' },
  dateConfirmBtn: { backgroundColor: '#10B981' },
  dateActionText: { fontWeight: '700' },
  dateCancelText: { color: '#374151' },
  dateConfirmText: { color: '#fff' },

  hubSection: { marginTop: 16 },
  hubOptions: { gap: 12, marginTop: 12 },
  hubOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    gap: 12,
  },
  hubOptionSelected: { borderColor: '#10B981', backgroundColor: '#D1FAE5' },
  hubOptionText: { fontSize: 15, fontWeight: '500', color: '#6B7280', flex: 1 },
  hubOptionTextSelected: { color: '#10B981', fontWeight: '600' },
});
