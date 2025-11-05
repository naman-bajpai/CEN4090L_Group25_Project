import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/login" options={{ title: 'Sign In' }} />
      <Stack.Screen name="(auth)/signup" options={{ title: 'Create Account' }} />
      <Stack.Screen name="(auth)/reset" options={{ title: 'Reset Password' }} />
      <Stack.Screen name="(tabs)/_layout" options={{ headerShown: false }} />
    </Stack>
  );
}
