import { LinearGradient } from 'expo-linear-gradient';
import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Page({
  children,
  pad = true,
  contentStyle,
}: {
  children: ReactNode;
  pad?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={["#F8FAFC", "#EEF2FF"]} style={styles.gradient}>
      <LinearGradient
        colors={["#FEE2E2", "transparent"]}
        style={styles.accentBlobTop}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={["#E0E7FF", "transparent"]}
        style={styles.accentBlobBottom}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.content, pad && styles.padded, contentStyle]}>{children}</View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1 },
  padded: { paddingHorizontal: 20 },
  accentBlobTop: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.35,
  },
  accentBlobBottom: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.35,
  },
});

