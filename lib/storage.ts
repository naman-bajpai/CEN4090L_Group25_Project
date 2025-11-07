import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

export async function uploadItemImage(userId: string, localUri: string) {
  const path = `${userId}/${Date.now()}.jpg`;
  
  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: 'base64',
  });

  // Convert base64 string to ArrayBuffer for React Native
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Supabase storage accepts ArrayBuffer or Blob
  const { error } = await supabase.storage
    .from('item-images')
    .upload(path, bytes.buffer, {
      upsert: false,
      contentType: 'image/jpeg',
    });

  if (error) throw error;
  return path;
}

export async function getSignedImageUrl(path: string, expiresSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from('item-images')
    .createSignedUrl(path, expiresSeconds);

  if (error) throw error;
  return data.signedUrl;
}
