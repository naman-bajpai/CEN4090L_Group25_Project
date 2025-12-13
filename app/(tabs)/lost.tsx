// app/(tabs)/lost.tsx
import Page from '@/components/Page';
import Field from '@/components/TextField';
import {
  createItem,
  deleteItem,
  getItemImageUrl,
  getItems,
  type ItemWithProfile,
} from '@/lib/api';
import { useAuth } from '@/lib/session';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function LostItemCard({
  item,
  session,
  onDelete,
}: {
  item: ItemWithProfile;
  session: any;
  onDelete: (id: string) => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (item.image_path) {
      getItemImageUrl(item.image_path).then(setImageUrl);
    }
  }, [item.image_path]);

  const isOwner = session && item.user_id === session.user.id;

  return (
    <View style={styles.itemCard}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />
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
          {item.when_lost && (
            <View style={styles.itemMeta}>
              <Ionicons name="calendar" size={14} color="#6B7280" />
              <Text style={styles.itemMetaText}>
                {new Date(item.when_lost).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {isOwner && (
          <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(item.id)}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function LostItemsScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<ItemWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<ItemWithProfile[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [location, setLocation] = useState('');
  const [whenLost, setWhenLost] = useState('');
  const [showWhenLostPicker, setShowWhenLostPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [imageUri, setImageUri] = useState<string | null>(null);

  const loadItems = async () => {
    try {
      const data = await getItems({ type: 'lost' });
      setItems(data as ItemWithProfile[]);
    } catch (error) {
      console.error('Failed to load items:', error);
      Alert.alert('Error', 'Failed to load lost items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadItems();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll permissions to upload images');
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
    setTitle('');
    setDescription('');
    setColor('');
    setLocation('');
    setWhenLost('');
    setImageUri(null);
    setShowWhenLostPicker(false);
    setShowForm(false);
  };

  const openWhenLostPicker = () => {
    if (whenLost) setSelectedDate(new Date(whenLost));
    else setSelectedDate(new Date());
    requestAnimationFrame(() => setShowWhenLostPicker(true));
  };

  const handleDateConfirm = () => {
    const isoDate = selectedDate.toISOString().split('T')[0];
    setWhenLost(isoDate);
    setShowWhenLostPicker(false);
  };

  const handleSubmit = async () => {
    if (!session) {
      Alert.alert('Error', 'You must be logged in to report a lost item');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Missing Info', 'Please enter a title for your lost item');
      return;
    }

    setSubmitting(true);
    try {
      await createItem(
        {
          user_id: session.user.id,
          type: 'lost',
          title: title.trim(),
          description: description.trim() || null,
          color: color.trim() || null,
          location: location.trim() || null,
          when_lost: whenLost ? new Date(whenLost).toISOString() : null,
          status: 'open',
        },
        imageUri || undefined
      );
      Alert.alert('Success', 'Lost item reported successfully!');
      resetForm();
      loadItems();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create lost item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (itemId: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteItem(itemId);
            loadItems();
            if (isSearchMode) handleSearch(searchQuery);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setIsSearchMode(false);
      setFilteredItems([]);
      return;
    }

    setIsSearchMode(true);
    
    const queryLower = query.toLowerCase().trim();
    const filtered = items.filter((item) => {
      const titleMatch = item.title?.toLowerCase().includes(queryLower);
      const descriptionMatch = item.description?.toLowerCase().includes(queryLower);
      return titleMatch || descriptionMatch;
    });
    
    setFilteredItems(filtered);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    setFilteredItems([]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#782F40" />
      </View>
    );
  }

  const displayItems = isSearchMode ? filteredItems : items;

  return (
    <Page>
      <View style={styles.container}>
        <StatusBar style="dark" />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Lost Items</Text>
              <Text style={styles.subtitle}>
                {isSearchMode 
                  ? `${filteredItems.length} result${filteredItems.length !== 1 ? 's' : ''}`
                  : `${items.length} item${items.length !== 1 ? 's' : ''} reported`
                }
              </Text>
            </View>
            {session && !isSearchMode && (
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => setShowForm(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or description..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isSearchMode && (
            <TouchableOpacity style={styles.backButton} onPress={handleClearSearch}>
              <Ionicons name="arrow-back" size={16} color="#782F40" />
              <Text style={styles.backButtonText}>Clear search</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={
            !isSearchMode ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
          }
          showsVerticalScrollIndicator={false}
        >
          {displayItems.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons 
                  name={isSearchMode ? "search-outline" : "document-text-outline"} 
                  size={64} 
                  color="#D1D5DB" 
                />
              </View>
              <Text style={styles.emptyText}>
                {isSearchMode ? 'No matches found' : 'No lost items reported'}
              </Text>
              <Text style={styles.emptySubtext}>
                {isSearchMode 
                  ? 'Try a different search term'
                  : session 
                    ? 'Be the first to report a lost item!' 
                    : 'Sign in to report a lost item'
                }
              </Text>
            </View>
          ) : (
            <View style={styles.itemsContainer}>
              {displayItems.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  onPress={() => router.push(`/(tabs)/item/${item.id}`)} 
                  activeOpacity={0.7}
                >
                  <LostItemCard item={item} session={session} onDelete={handleDelete} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Report Lost Item Modal */}
        <Modal visible={showForm} animationType="slide" transparent={false} onRequestClose={resetForm}>
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }]}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalTitleContainer}>
                  <View style={styles.modalIconContainer}>
                    <Ionicons name="document-text" size={24} color="#782F40" />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Report Lost Item</Text>
                    <Text style={styles.modalSubtitle}>Help others find your item</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={resetForm}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContentContainer}
              keyboardShouldPersistTaps="handled"
            >
              {/* Image Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Photo</Text>
                <Text style={styles.sectionSubtitle}>Add a photo to help identify your item</Text>

                {imageUri ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    <View style={styles.imageActions}>
                      <TouchableOpacity style={styles.imageActionButton} onPress={showImagePicker}>
                        <Ionicons name="camera" size={18} color="#782F40" />
                        <Text style={styles.imageActionText}>Change</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.imageActionButton, styles.removeButton]}
                        onPress={() => setImageUri(null)}
                      >
                        <Ionicons name="trash" size={18} color="#EF4444" />
                        <Text style={[styles.imageActionText, styles.removeButtonText]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.imagePickerButton} onPress={showImagePicker} activeOpacity={0.7}>
                    <View style={styles.imagePickerIconContainer}>
                      <Ionicons name="camera-outline" size={32} color="#782F40" />
                    </View>
                    <Text style={styles.imagePickerText}>Add Photo</Text>
                    <Text style={styles.imagePickerSubtext}>Optional</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Basic Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Basic Information</Text>

                <Field
                  label="Item Title"
                  placeholder="e.g., Red Wallet, iPhone 13"
                  value={title}
                  onChangeText={setTitle}
                  autoCapitalize="words"
                  icon="pricetag"
                />

                <Field
                  label="Description"
                  placeholder="Describe your item in detail..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  style={styles.textArea}
                  icon="text"
                />
              </View>

              {/* Additional Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Additional Details</Text>
                <Text style={styles.sectionSubtitle}>
                  These details help others identify your item
                </Text>

                <Field
                  label="Color"
                  placeholder="e.g., Red, Blue, Black"
                  value={color}
                  onChangeText={setColor}
                  icon="color-palette"
                />

                <Field
                  label="Location"
                  placeholder="Where did you lose it?"
                  value={location}
                  onChangeText={setLocation}
                  icon="location"
                />

                <TouchableOpacity activeOpacity={0.7} onPress={openWhenLostPicker}>
                  <Field
                    label="When Lost"
                    placeholder="Select date"
                    value={whenLost ? new Date(whenLost).toLocaleDateString() : ''}
                    editable={false}
                    icon="calendar"
                    rightAccessory={<Ionicons name="chevron-down" size={18} color="#6B7280" />}
                  />
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <View style={styles.submitContainer}>
                <TouchableOpacity
                  style={[styles.submitButton, (submitting || !title.trim()) && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting || !title.trim()}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" style={styles.submitLoader} />
                      <Text style={styles.submitButtonText}>Submitting...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>Report Lost Item</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={styles.requiredNote}>* Title is required</Text>
              </View>
            </ScrollView>

            {/* Date Picker Modal */}
            {showWhenLostPicker && (
              <Modal
                visible
                transparent
                animationType="fade"
                presentationStyle="overFullScreen"
                statusBarTranslucent
                onRequestClose={() => setShowWhenLostPicker(false)}
              >
                <View style={styles.dateModalBackdrop}>
                  <TouchableOpacity
                    style={styles.dateModalBackdropTouchable}
                    activeOpacity={1}
                    onPress={() => setShowWhenLostPicker(false)}
                  />
                  <View style={styles.dateModalCard}>
                    <View style={styles.dateModalHeader}>
                      <Text style={styles.dateModalTitle}>Select Date</Text>
                      <TouchableOpacity onPress={() => setShowWhenLostPicker(false)}>
                        <Ionicons name="close" size={24} color="#6B7280" />
                      </TouchableOpacity>
                    </View>

                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      maximumDate={new Date()}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      themeVariant="light"
                      textColor="#111827"
                      onChange={(event: any, date?: Date) => {
                        if (Platform.OS === 'android') {
                          setShowWhenLostPicker(false);
                          if (event.type === 'set' && date) {
                            setSelectedDate(date);
                            setWhenLost(date.toISOString().split('T')[0]);
                          }
                          return;
                        }
                        if (date) setSelectedDate(date);
                        if (event.type === 'dismissed') setShowWhenLostPicker(false);
                      }}
                    />

                    {Platform.OS === 'ios' && (
                      <View style={styles.dateActions}>
                        <TouchableOpacity
                          style={[styles.dateActionBtn, styles.dateCancelBtn]}
                          onPress={() => setShowWhenLostPicker(false)}
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
              </Modal>
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
    backgroundColor: '#782F40',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#782F40',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    marginTop: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: { marginRight: 12 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
  },
  clearButton: { padding: 4, marginLeft: 8 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    gap: 6,
  },
  backButtonText: {
    color: '#782F40',
    fontWeight: '600',
    fontSize: 14,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: { flex: 1 },
  modalContentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 18,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  imagePickerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 40,
    backgroundColor: '#FAFAFA',
    gap: 12,
  },
  imagePickerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
  imagePickerSubtext: {
    color: '#6B7280',
    fontSize: 13,
  },
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
  previewImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#F3F4F6',
  },
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
  removeButton: {
    backgroundColor: '#FEF2F2',
  },
  imageActionText: {
    color: '#782F40',
    fontWeight: '600',
    fontSize: 14,
  },
  removeButtonText: {
    color: '#EF4444',
  },
  submitContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#782F40',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#782F40',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  submitLoader: {
    marginRight: 0,
  },
  requiredNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  dateModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dateModalBackdropTouchable: {
    flex: 1,
  },
  dateModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  dateActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  dateActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  dateConfirmBtn: {
    backgroundColor: '#782F40',
  },
  dateActionText: {
    fontWeight: '700',
  },
  dateCancelText: {
    color: '#374151',
  },
  dateConfirmText: {
    color: '#fff',
  },
  resultsHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  resultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});
