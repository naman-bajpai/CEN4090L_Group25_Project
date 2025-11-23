import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NavItem {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const navItems: NavItem[] = [
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
    name: 'profile',
    label: 'Profile',
    icon: 'person',
    route: '/(tabs)/profile',
  },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Hide bottom nav on item detail pages and auth pages
  const hideNav = pathname?.includes('/item/') || pathname?.startsWith('/(auth)');

  const isActive = (route: string) => {
    // Normalize pathname for comparison
    const normalizedPath = pathname || '';
    
    if (route === '/(tabs)/home') {
      return normalizedPath === '/(tabs)/home' || 
             normalizedPath === '/' || 
             normalizedPath === '/(tabs)/index' ||
             normalizedPath === '/(tabs)';
    }
    
    // For other routes, check if pathname starts with the route
    return normalizedPath.startsWith(route);
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
                    color={active ? '#782F40' : '#9CA3AF'}
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
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
    backgroundColor: '#FEF2F2',
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
    backgroundColor: '#FFFFFF',
    shadowColor: '#782F40',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  activeDot: {
    position: 'absolute',
    top: 6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#782F40',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 1,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#782F40',
    fontWeight: '700',
    fontSize: 11,
  },
});

