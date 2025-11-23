import Field from '@/components/TextField';
import { createItem, deleteItem, getItemImageUrl, getItems, searchLostItemsWithAI, type ItemWithMatchScore, type ItemWithProfile } from '@/lib/api';
import { useAuth } from '@/lib/session';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


function LostItemCard({
  item,
  session,
  onDelete,
  showMatchScore,
}: {
  item: ItemWithProfile | ItemWithMatchScore;
  session: any;
  onDelete: (id: string) => void;
  showMatchScore?: boolean;
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
      {imageUrl && (
        <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />
      )}
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title}
          </Text>
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
        {'matchScore' in item && showMatchScore && (
          <View style={styles.matchScoreContainer}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.matchScoreText}>
              {Math.round(item.matchScore * 100)}% match
            </Text>
          </View>
        )}
        <View style={styles.itemFooter}>
          {item.location && (
            <View style={styles.itemMeta}>
              <Ionicons name="location" size={14} color="#666" />
              <Text style={styles.itemMetaText}>{item.location}</Text>
            </View>
          )}
          {item.color && (
            <View style={styles.itemMeta}>
              <Ionicons name="color-palette" size={14} color="#666" />
              <Text style={styles.itemMetaText}>{item.color}</Text>
            </View>
          )}
          {item.when_lost && (
            <View style={styles.itemMeta}>
              <Ionicons name="calendar" size={14} color="#666" />
              <Text style={styles.itemMetaText}>
                {new Date(item.when_lost).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
        {isOwner && (
          <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(item.id)}>
            <Ionicons name="trash" size={16} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function LostItemsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ItemWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ItemWithMatchScore[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [location, setLocation] = useState('');
  const [whenLost, setWhenLost] = useState('');
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
    setShowForm(false);
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
            if (isSearchMode) {
              handleSearch();
            }
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearchMode(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setIsSearchMode(true);
    try {
      const results = await searchLostItemsWithAI(searchQuery.trim(), {
        limit: 20,
        minScore: 0.3,
      });
      setSearchResults(results);
    } catch (error: any) {
      console.error('Search error:', error);
      Alert.alert(
        'Search Error',
        error.message || 'Failed to search items. Please try again.'
      );
      setIsSearchMode(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    setSearchResults([]);
  };


  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar style="auto" />
        <ActivityIndicator size="large" color="#782F40" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Describe what you're looking for (e.g., 'red wallet with cards')"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={styles.searchButtonText}>AI Search</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {isSearchMode && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleClearSearch}
          >
            <Ionicons name="arrow-back" size={18} color="#782F40" />
            <Text style={styles.backButtonText}>Show All Items</Text>
          </TouchableOpacity>
        )}

        {session && !isSearchMode && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(true)}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Report Lost Item</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        refreshControl={
          !isSearchMode ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {isSearchMode ? (
          isSearching ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#782F40" />
              <Text style={styles.searchingText}>Searching with AI...</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No matches found</Text>
              <Text style={styles.emptySubtext}>
                Try describing your item differently or check back later
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsText}>
                  Found {searchResults.length} matching item{searchResults.length !== 1 ? 's' : ''}
                </Text>
              </View>
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.push(`/(tabs)/item/${item.id}`)}
                  activeOpacity={0.7}
                >
                  <LostItemCard
                    item={item}
                    session={session}
                    onDelete={handleDelete}
                    showMatchScore={true}
                  />
                </TouchableOpacity>
              ))}
            </>
          )
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No lost items reported</Text>
            <Text style={styles.emptySubtext}>
              {session ? 'Be the first to report a lost item!' : 'Sign in to report a lost item'}
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(`/(tabs)/item/${item.id}`)}
              activeOpacity={0.7}
            >
              <LostItemCard
                item={item}
                session={session}
                onDelete={handleDelete}
                showMatchScore={false}
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showForm}
        animationType="slide"
        transparent={false}
        onRequestClose={resetForm}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }]}>
            <View style={styles.modalHeaderContent}>
              <View style={styles.modalTitleContainer}>
                <Ionicons name="document-text" size={28} color="#782F40" />
                <Text style={styles.modalTitle}>Report Lost Item</Text>
              </View>
              <TouchableOpacity 
                onPress={resetForm}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={32} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Help others find your lost item by providing details
            </Text>
          </View>

          <ScrollView 
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContentContainer}
          >
            {/* Image Section */}
            <View style={styles.section}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="image" size={18} color="#782F40" />
                <Text style={styles.sectionTitle}>Photo</Text>
              </View>
              <Text style={styles.sectionSubtitle}>Add a photo to help identify your item</Text>
              
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} />
                  <View style={styles.imageActions}>
                    <TouchableOpacity 
                      style={styles.imageActionButton}
                      onPress={showImagePicker}
                    >
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
                <TouchableOpacity 
                  style={styles.imagePickerButton} 
                  onPress={showImagePicker}
                  activeOpacity={0.7}
                >
                  <View style={styles.imagePickerIconContainer}>
                    <Ionicons name="camera-outline" size={32} color="#782F40" />
                  </View>
                  <Text style={styles.imagePickerText}>Add Photo</Text>
                  <Text style={styles.imagePickerSubtext}>Optional - Tap to add from camera or gallery</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Basic Information Section */}
            <View style={styles.section}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="information-circle" size={18} color="#782F40" />
                <Text style={styles.sectionTitle}>Basic Information</Text>
              </View>
              
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

            {/* Additional Details Section */}
            <View style={styles.section}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="list" size={18} color="#782F40" />
                <Text style={styles.sectionTitle}>Additional Details</Text>
              </View>
              <Text style={styles.sectionSubtitle}>These details help others identify your item</Text>
              
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

              <Field
                label="When Lost"
                placeholder="YYYY-MM-DD (e.g., 2024-01-15)"
                value={whenLost}
                onChangeText={setWhenLost}
                icon="calendar"
              />
            </View>

            {/* Submit Button */}
            <View style={styles.submitContainer}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (submitting || !title.trim()) && styles.submitButtonDisabled
                ]}
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
              <Text style={styles.requiredNote}>
                * Required fields must be filled
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#782F40',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    marginBottom: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  itemContent: {
    padding: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusOpen: {
    backgroundColor: '#DCFCE7',
  },
  statusClaimed: {
    backgroundColor: '#FEF3C7',
  },
  statusClosed: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1a1a1a',
    textTransform: 'uppercase',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemMetaText: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.3,
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
    padding: 32,
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
    color: '#1F2937',
    fontWeight: '600',
    fontSize: 16,
  },
  imagePickerSubtext: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    marginTop: -4,
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
  searchContainer: {
    marginBottom: 12,
    gap: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#782F40',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
    marginBottom: 8,
  },
  backButtonText: {
    color: '#782F40',
    fontWeight: '600',
    fontSize: 14,
  },
  matchScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  matchScoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  searchingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  resultsHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});
