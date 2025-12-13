import { Redirect } from 'expo-router';
import React from 'react';

export default function AdminIndex() {
  return <Redirect href="/(tabs)/admin/overview" />;
}
