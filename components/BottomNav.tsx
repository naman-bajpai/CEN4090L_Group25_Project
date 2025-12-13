import { checkIsAdmin } from '@/lib/api';
import { useAuth } from '@/lib/session';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NavItem {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const baseNavItems: NavItem[] = [
  {
    name: 'home',
    label: 'Home',
    icon: 'home',
    route: '/(tabs)/home',
  },
  {
    name: 'found',
    label: 'Found',
    icon: 'search',
    route: '/(tabs)/found',
  },
  {
    name: 'lost',
    label: 'Lost',
    icon: 'add-circle',
    route: '/(tabs)/lost',
  },
  {
    name: 'messages',
    label: 'Messages',
    icon: 'chatbubble-ellipses',
    route: '/(tabs)/messages',
  },
  {
    name: 'profile',
    label: 'Profile',
    icon: 'person',
    route: '/(tabs)/profile',
  },
];

const adminNavItem: NavItem = {
  name: 'admin',
  label: 'Admin',
  icon: 'shield-checkmark',
  route: '/(tabs)/admin',
};

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Normalize paths: remove route groups like (tabs), collapse slashes, trim trailing slash
  const normalize = (path: string) => {
    const stripped = (path || '').replace(/\([^/]+\)/g, '');
    // collapse multiple slashes
    let p = stripped.replace(/\/+/, '/');
    // ensure starts with '/'
    if (!p.startsWith('/')) p = `/${p}`;
    // trim trailing slash except root
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p;
  };

  useEffect(() => {
    const checkAdmin = async () => {
      if (!session) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }
      try {
        const adminStatus = await checkIsAdmin();
        setIsAdmin(adminStatus);
      } catch (error) {
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };
    checkAdmin();
  }, [session]);

  // Build nav items based on admin status
  const navItems = isAdmin
    ? [...baseNavItems, adminNavItem]
    : baseNavItems;

  // Hide bottom nav on item detail pages, auth pages, and admin pages
  const isAdminPage = pathname?.includes('/admin') || pathname?.startsWith('/(tabs)/admin');
  const hideNav =
    pathname?.includes('/item/') ||
    pathname?.startsWith('/(auth)') ||
    isAdminPage;

  const isActive = (route: string) => {
    const current = normalize(pathname || '');
    const target = normalize(route);

    // Home can be represented by '/' or '/home'
    if (target === '/home') {
      return current === '/' || current === '/home';
    }
    return current === target || current.startsWith(`${target}/`);
  };

  if (hideNav) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12,
        },
      ]}
    >
      <View style={styles.navBar}>
        {navItems.map((item) => {
          const active = isActive(item.route);
          return (
            <TouchableOpacity
              key={item.name}
              style={styles.navItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrapper, active && styles.iconWrapperActive]}>
                <View style={[styles.iconContainer, active && styles.iconContainerActive]}>
                  <Ionicons
                    name={active ? item.icon : (`${item.icon}-outline` as any)}
                    size={active ? 24 : 22}
                    color={active ? '#FFFFFF' : '#9CA3AF'}
                  />
                </View>
              </View>
              {active && <View style={styles.activeDot} />}
              <Text style={[styles.label, active && styles.labelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 4,
    position: 'relative',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(120, 47, 64, 0.1)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconContainerActive: {
    backgroundColor: '#782F40',
    shadowColor: '#782F40',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  activeDot: {
    position: 'absolute',
    top: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#782F40',
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 1,
    letterSpacing: 0.1,
  },
  labelActive: {
    color: '#782F40',
    fontWeight: '700',
    fontSize: 10,
  },
});
