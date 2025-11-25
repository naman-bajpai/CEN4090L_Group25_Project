import { StatusBar } from 'expo-status-bar';
import { ReactNode } from 'react';
import { SafeAreaView, View, ViewStyle, StyleProp } from 'react-native';

export default function Screen({
  children,
  noPadding,
  style,
  unsafe,
}: {
  children: ReactNode;
  noPadding?: boolean;
  style?: StyleProp<ViewStyle>;
  unsafe?: boolean;
}) {
  const Container = unsafe ? View : SafeAreaView;
  return (
    <Container style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar style="dark" />
      <View style={[{ flex: 1, padding: noPadding ? 0 : 16 }, style]}>{children}</View>
    </Container>
  );
}
