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
});
