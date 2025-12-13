import AdminBottomNav from '@/components/AdminBottomNav';
import Page from '@/components/Page';
import { adminGetAllItems, checkIsAdmin, getAllStudents } from '@/lib/api';
import { useAuth } from '@/lib/session';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Stats {
  totalStudents: number;
  verifiedStudents: number;
  totalItems: number;
  openItems: number;
  lostItems: number;
  foundItems: number;
}

export default function AdminOverview() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    verifiedStudents: 0,
    totalItems: 0,
    openItems: 0,
    lostItems: 0,
    foundItems: 0,
  });

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
      const [studentsData, itemsData] = await Promise.all([
        getAllStudents(),
        adminGetAllItems(),
      ]);

      const verifiedCount = studentsData.filter((s) => s.verified).length;
      const openCount = itemsData.filter((i) => i.status === 'open').length;
      const lostCount = itemsData.filter((i) => i.type === 'lost').length;
      const foundCount = itemsData.filter((i) => i.type === 'found').length;

      setStats({
        totalStudents: studentsData.length,
        verifiedStudents: verifiedCount,
        totalItems: itemsData.length,
        openItems: openCount,
        lostItems: lostCount,
        foundItems: foundCount,
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

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
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>Overview & Statistics</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={20} color="#782F40" />
            <Text style={styles.badgeText}>Admin</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent} // ✅ FIX: add bottom padding here
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="people" size={24} color="#1E40AF" />
            </View>
            <Text style={styles.statValue}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#059669" />
            </View>
            <Text style={styles.statValue}>{stats.verifiedStudents}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="cube" size={24} color="#DC2626" />
            </View>
            <Text style={styles.statValue}>{stats.totalItems}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time" size={24} color="#D97706" />
            </View>
            <Text style={styles.statValue}>{stats.openItems}</Text>
            <Text style={styles.statLabel}>Open Items</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E0E7FF' }]}>
              <Ionicons name="search" size={24} color="#4338CA" />
            </View>
            <Text style={styles.statValue}>{stats.lostItems}</Text>
            <Text style={styles.statLabel}>Lost Items</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
            </View>
            <Text style={styles.statValue}>{stats.foundItems}</Text>
            <Text style={styles.statLabel}>Found Items</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/admin/students')}
          >
            <Ionicons name="people" size={24} color="#782F40" />
            <Text style={styles.actionButtonText}>Manage Students</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/admin/items')}
          >
            <Ionicons name="cube" size={24} color="#782F40" />
            <Text style={styles.actionButtonText}>Manage Items</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>

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
  scrollView: {
    flex: 1,
  },

  // ✅ NEW: handles spacing above floating tab bar consistently
  scrollContent: {
    paddingBottom: 140,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },

  // ✅ UPDATED: removed marginBottom hack
  quickActions: {
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
});
