import { ReactNode } from 'react';
import { SafeAreaView, View } from 'react-native';

export default function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, padding: 16 }}>{children}</View>
    </SafeAreaView>
  );
}
