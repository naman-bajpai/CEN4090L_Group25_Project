import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false, headerBackVisible: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false, headerBackVisible: false }} />
        <Stack.Screen name="(auth)/signup" options={{ headerShown: false, headerBackVisible: false }} />
        <Stack.Screen name="(auth)/reset" options={{ headerShown: false, headerBackVisible: false }} />
        <Stack.Screen name="(tabs)/_layout" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
