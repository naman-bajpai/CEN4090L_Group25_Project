import AdminBottomNav from '@/components/AdminBottomNav';
import Page from '@/components/Page';
import {
    adminDeleteStudent,
    adminUnverifyStudent,
    adminVerifyStudent,
    checkIsAdmin,
    getAllStudents,
} from '@/lib/api';
import type { Tables } from '@/lib/database.types';
import { useAuth } from '@/lib/session';
import { Ionicons } from '@expo/vector-icons';
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

type Profile = Tables<'profiles'>;

export default function AdminStudents() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all');

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
      const studentsData = await getAllStudents();
      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleVerifyStudent = async (userId: string) => {
    try {
      await adminVerifyStudent(userId);
      await loadData();
      Alert.alert('Success', 'Student verified successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify student');
    }
  };

  const handleUnverifyStudent = async (userId: string) => {
    try {
      await adminUnverifyStudent(userId);
      await loadData();
      Alert.alert('Success', 'Student unverified successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to unverify student');
    }
  };

  const handleDeleteStudent = (userId: string, name: string | null) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete ${name || 'this student'}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminDeleteStudent(userId);
              await loadData();
              Alert.alert('Success', 'Student deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete student');
            }
          },
        },
      ]
    );
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      !searchQuery ||
      student.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVerified =
      filterVerified === 'all' ||
      (filterVerified === 'verified' && student.verified) ||
      (filterVerified === 'unverified' && !student.verified);
    return matchesSearch && matchesVerified;
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
            <Text style={styles.headerTitle}>Students</Text>
            <Text style={styles.headerSubtitle}>{students.length} total students</Text>
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
          placeholder="Search students..."
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
        <Text style={styles.filterLabel}>Filter:</Text>
        {(['all', 'verified', 'unverified'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              filterVerified === filter && styles.filterChipActive,
            ]}
            onPress={() => setFilterVerified(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterVerified === filter && styles.filterChipTextActive,
              ]}
            >
              {filter === 'all' ? 'All' : filter === 'verified' ? 'Verified' : 'Unverified'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.studentCard}>
            <View style={styles.studentInfo}>
              <View style={styles.studentHeader}>
                <Text style={styles.studentName}>
                  {item.full_name || 'No name'}
                </Text>
                {item.verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
                {item.role === 'admin' && (
                  <View style={styles.adminBadge}>
                    <Ionicons name="shield-checkmark" size={16} color="#782F40" />
                    <Text style={styles.adminText}>Admin</Text>
                  </View>
                )}
              </View>
              <Text style={styles.studentId}>ID: {item.id.slice(0, 8)}...</Text>
            </View>
            <View style={styles.studentActions}>
              {!item.verified ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.verifyBtn]}
                  onPress={() => handleVerifyStudent(item.id)}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <Text style={styles.verifyBtnText}>Verify</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.unverifyBtn]}
                  onPress={() => handleUnverifyStudent(item.id)}
                >
                  <Ionicons name="close-circle" size={18} color="#DC2626" />
                  <Text style={styles.unverifyBtnText}>Unverify</Text>
                </TouchableOpacity>
              )}
              {item.role !== 'admin' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDeleteStudent(item.id, item.full_name)}
                >
                  <Ionicons name="trash" size={18} color="#DC2626" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No students found</Text>
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
  studentCard: {
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
  studentInfo: {
    flex: 1,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  adminText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#782F40',
  },
  studentId: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  studentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verifyBtn: {
    backgroundColor: '#D1FAE5',
  },
  verifyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  unverifyBtn: {
    backgroundColor: '#FEE2E2',
  },
  unverifyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
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

