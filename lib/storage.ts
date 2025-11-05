import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

export async function uploadItemImage(userId: string, localUri: string) {
  // ✅ Use 'base64' instead of FileSystem.EncodingType.Base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: 'base64',
  });

  const path = `${userId}/${Date.now()}.jpg`;
  const buffer = Buffer.from(base64, 'base64');

  const { error } = await supabase.storage
    .from('item-images')
    .upload(path, buffer, {
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
