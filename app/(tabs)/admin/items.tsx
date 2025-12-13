import AdminBottomNav from '@/components/AdminBottomNav';
import Page from '@/components/Page';
import { adminDeleteItem, adminGetAllItems, checkIsAdmin } from '@/lib/api';
import type { Tables } from '@/lib/database.types';
import { useAuth } from '@/lib/session';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ItemWithProfile = Tables<'items'> & {
  profiles: { full_name: string | null; avatar_path: string | null } | null;
};

export default function AdminItems() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ItemWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'claimed' | 'closed'>('all');
  const [filterType, setFilterType] = useState<'all' | 'lost' | 'found'>('all');

  useEffect(() => {
    checkAdminAndLoad();
  }, [session]);

  const checkAdminAndLoad = async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      const adminStatus = await checkIsAdmin();
      setIsAdmin(adminStatus);

      if (adminStatus) {
        await loadData();
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const itemsData = await adminGetAllItems();
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error loading items:', error);
      Alert.alert('Error', 'Failed to load items');
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDeleteItem = (itemId: string, title: string) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminDeleteItem(itemId);
              await loadData();
              Alert.alert('Success', 'Item deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <Page>
        <View style={styles.centerContainer}>
          <StatusBar style="dark" />
          <ActivityIndicator size="large" color="#782F40" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </Page>
    );
  }

  if (!isAdmin) {
    return (
      <Page>
        <View style={styles.centerContainer}>
          <StatusBar style="dark" />
          <Ionicons name="lock-closed" size={64} color="#9CA3AF" />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>Admin privileges required</Text>
        </View>
      </Page>
    );
  }

  return (
    <Page>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Items</Text>
            <Text style={styles.headerSubtitle}>{items.length} total items</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={20} color="#782F40" />
            <Text style={styles.badgeText}>Admin</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filters}>
        <Text style={styles.filterLabel}>Status:</Text>
        {(['all', 'open', 'claimed', 'closed'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              filterStatus === status && styles.filterChipActive,
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterStatus === status && styles.filterChipTextActive,
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={[styles.filterLabel, { marginLeft: 16 }]}>Type:</Text>
        {(['all', 'lost', 'found'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterChip,
              filterType === type && styles.filterChipActive,
            ]}
            onPress={() => setFilterType(type)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterType === type && styles.filterChipTextActive,
              ]}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemCard}
            onPress={() => router.push(`/(tabs)/item/${item.id}`)}
          >
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.itemMeta}>
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
                <View
                  style={[
                    styles.typeBadge,
                    item.type === 'lost' ? styles.typeLost : styles.typeFound,
                  ]}
                >
                  <Ionicons
                    name={item.type === 'lost' ? 'search' : 'checkmark-circle'}
                    size={14}
                    color="#666"
                  />
                  <Text style={styles.typeText}>{item.type}</Text>
                </View>
                {item.profiles && (
                  <Text style={styles.itemAuthor}>
                    by {item.profiles.full_name || 'Unknown'}
                  </Text>
                )}
              </View>
              {item.description && (
                <Text style={styles.itemDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.deleteItemBtn}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteItem(item.id, item.title);
              }}
            >
              <Ionicons name="trash" size={18} color="#DC2626" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      />
      <AdminBottomNav />
    </Page>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#782F40',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#782F40',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#782F40',
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusOpen: {
    backgroundColor: '#FEF3C7',
  },
  statusClaimed: {
    backgroundColor: '#DBEAFE',
  },
  statusClosed: {
    backgroundColor: '#E5E7EB',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  typeLost: {
    backgroundColor: '#E0E7FF',
  },
  typeFound: {
    backgroundColor: '#DCFCE7',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  itemAuthor: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  itemDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  deleteItemBtn: {
    padding: 8,
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
});

