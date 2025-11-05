import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function AuthLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          presentation: 'card',
        }}
      >
        {/* existing screens */}
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />

        {/* new reset password screen */}
        <Stack.Screen name="reset" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
