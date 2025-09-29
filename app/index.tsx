import { router } from 'expo-router';
import React from 'react';
import { Button, Text, View } from 'react-native';

export default function LandingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Landing Page</Text> 
      <Button title="Login" onPress={() => router.push('/login')} />
      <Button title="Signup" onPress={() => router.push('/signup')} />
      <Button title="Lost" onPress={() => router.push('/lost')} />
      <Button title="Found" onPress={() => router.push('/found')} />
      <Button title="Profile" onPress={() => router.push('/profile')} />
    </View>
  );
}
