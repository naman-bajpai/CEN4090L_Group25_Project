import { claimItem, createNotification, getItemImageUrl, getItems } from '@/lib/api';
import type { Tables } from '@/lib/database.types';
import { useAuth } from '@/lib/session';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Page from '@/components/Page';
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
    <TouchableOpacity style={styles.itemCard} onPress={onPress}>
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
          {item.profiles?.full_name && (
            <View style={styles.itemMeta}>
              <Ionicons name="person" size={14} color="#666" />
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
          >
            <Text style={styles.claimButtonText}>Claim This Item</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
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

  const loadItems = async () => {
    try {
      const filters: any = { type: 'found' };
      if (filter !== 'all') {
        filters.status = filter;
      }
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
      await createNotification(
        selectedItem.user_id,
        `Your found item "${selectedItem.title}" has been claimed!`
      );
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
      <View style={styles.header}>
        <Text style={styles.title}>Found Items</Text>
        <Text style={styles.subtitle}>Items found by the community</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'open' && styles.filterButtonActive]}
          onPress={() => setFilter('open')}
        >
          <Text style={[styles.filterText, filter === 'open' && styles.filterTextActive]}>
            Open
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'claimed' && styles.filterButtonActive]}
          onPress={() => setFilter('claimed')}
        >
          <Text style={[styles.filterText, filter === 'claimed' && styles.filterTextActive]}>
            Claimed
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No found items</Text>
            <Text style={styles.emptySubtext}>Check back later!</Text>
          </View>
        ) : (
          items.map((item) => (
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
          ))
        )}
      </ScrollView>

      <Modal
        visible={claimModalVisible}
        animationType="slide"
        transparent={true}
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
    </View>
    </Page>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
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
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#782F40',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
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
  claimButton: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  claimButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  modalItemTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalDetails: {
    marginBottom: 16,
  },
  modalDetailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modalQuestion: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 20,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonConfirm: {
    backgroundColor: '#10B981',
  },
  modalButtonTextCancel: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: '#fff',
    fontWeight: '600',
  },
});
