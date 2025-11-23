import BottomNav from '@/components/BottomNav';
import { Stack } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="home" />
        <Stack.Screen name="found" />
        <Stack.Screen name="lost" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="item/[id]" />
      </Stack>
      <BottomNav />
    </>
  );
}
