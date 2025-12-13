import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface NavItem {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const adminNavItems: NavItem[] = [
  { name: 'overview', label: 'Overview', icon: 'stats-chart', route: '/(tabs)/admin/overview' },
  { name: 'students', label: 'Students', icon: 'people', route: '/(tabs)/admin/students' },
  { name: 'items', label: 'Items', icon: 'cube', route: '/(tabs)/admin/items' },
  { name: 'profile', label: 'Profile', icon: 'person', route: '/(tabs)/admin/profile' },
];

export default function AdminBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  // Normalize paths: remove route groups like (tabs), collapse slashes, trim trailing slash
  const normalize = (path: string) => {
    const stripped = (path || '').replace(/\([^/]+\)/g, '');
    let p = stripped.replace(/\/+/, '/');
    if (!p.startsWith('/')) p = `/${p}`;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p;
  };

  const isActive = (route: string) => {
    const current = normalize(pathname || '');
    const target = normalize(route);
    return current === target || current.startsWith(`${target}/`);
  };

  return (
    <View style={[styles.container, { paddingBottom: 12 }]}>
      <View style={styles.navBar}>
        {adminNavItems.map((item) => {
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
