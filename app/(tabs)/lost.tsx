import Button from '@/components/Button';
import Field from '@/components/TextField';
import { createItem, deleteItem, getItemImageUrl, getItems } from '@/lib/api';
import type { Tables } from '@/lib/database.types';
import { useAuth } from '@/lib/session';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ItemWithProfile = Tables<'items'> & {
  profiles: { full_name: string | null; avatar_path: string | null } | null;
};

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
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ItemWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete item');
          }
        },
      },
    ]);
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
        <Text style={styles.title}>Lost Items</Text>
        <Text style={styles.subtitle}>Report items you've lost</Text>
        {session && (
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No lost items reported</Text>
            <Text style={styles.emptySubtext}>
              {session ? 'Be the first to report a lost item!' : 'Sign in to report a lost item'}
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <LostItemCard
              key={item.id}
              item={item}
              session={session}
              onDelete={handleDelete}
            />
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
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report Lost Item</Text>
            <TouchableOpacity onPress={resetForm}>
              <Ionicons name="close" size={28} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Field
              placeholder="Item Title *"
              value={title}
              onChangeText={setTitle}
              autoCapitalize="words"
            />

            <Field
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              style={styles.textArea}
            />

            <Field placeholder="Color" value={color} onChangeText={setColor} />

            <Field placeholder="Location" value={location} onChangeText={setLocation} />

            <Field
              placeholder="When Lost (YYYY-MM-DD)"
              value={whenLost}
              onChangeText={setWhenLost}
            />

            <TouchableOpacity style={styles.imagePickerButton} onPress={showImagePicker}>
              <Ionicons name="camera" size={24} color="#782F40" />
              <Text style={styles.imagePickerText}>
                {imageUri ? 'Change Photo' : 'Add Photo (Optional)'}
              </Text>
            </TouchableOpacity>

            {imageUri && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImageUri(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            <Button
              title={submitting ? 'Submitting...' : 'Submit'}
              onPress={handleSubmit}
              disabled={submitting || !title.trim()}
            />
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
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#782F40',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    marginBottom: 12,
    gap: 8,
  },
  imagePickerText: {
    color: '#782F40',
    fontWeight: '600',
    fontSize: 16,
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
});
