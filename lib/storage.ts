// lib/storage.ts
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

// Helper function to convert base64 to Uint8Array (React Native compatible)
function base64ToUint8Array(base64: string): Uint8Array {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',')
    ? base64.split(',')[1]
    : base64;

  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);

  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  // Calculate buffer length accounting for padding
  let bufferLength = Math.floor(base64Data.length * 0.75);
  if (base64Data[base64Data.length - 1] === '=') {
    bufferLength--;
    if (base64Data[base64Data.length - 2] === '=') {
      bufferLength--;
    }
  }

  const bytes = new Uint8Array(bufferLength);
  let p = 0;

  for (let i = 0; i < base64Data.length; i += 4) {
    const encoded1 = lookup[base64Data.charCodeAt(i)] ?? 0;
    const encoded2 = lookup[base64Data.charCodeAt(i + 1)] ?? 0;
    const encoded3 = lookup[base64Data.charCodeAt(i + 2)] ?? 0;
    const encoded4 = lookup[base64Data.charCodeAt(i + 3)] ?? 0;

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);

    if (i + 2 < base64Data.length && base64Data[i + 2] !== '=') {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }

    if (i + 3 < base64Data.length && base64Data[i + 3] !== '=') {
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }

  return bytes;
}

export async function uploadItemImage(
  userId: string,
  localUri: string
) {
  const path = `${userId}/${Date.now()}.jpg`;

  try {
    // Read file as base64 using legacy expo-file-system API
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to Uint8Array (React Native compatible)
    const bytes = base64ToUint8Array(base64);

    // Upload to Supabase storage
    const { error } = await supabase.storage
      .from('item-images')
      .upload(path, bytes, {
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw error;
    }

    console.log('Image uploaded successfully to path:', path);
    return path;
  } catch (error: any) {
    console.error('Error uploading image:', error);
    throw new Error(
      `Failed to upload image: ${
        error?.message || 'Unknown error'
      }`
    );
  }
}

export async function getSignedImageUrl(
  path: string,
  expiresSeconds = 3600
) {
  const { data, error } = await supabase.storage
    .from('item-images')
    .createSignedUrl(path, expiresSeconds);

  if (error) throw error;
  return data.signedUrl;
}
