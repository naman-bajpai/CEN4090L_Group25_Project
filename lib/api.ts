import type { Tables, TablesInsert, TablesUpdate } from './database.types';
import { getSignedImageUrl, uploadItemImage } from './storage';
import { supabase } from './supabase';

// Profile API
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: TablesUpdate<'profiles'>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createProfile(userId: string, fullName: string) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, full_name: fullName })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Helper to enrich items with profile data
async function enrichItemsWithProfiles(items: Tables<'items'>[]) {
  if (items.length === 0) return [];
  
  const userIds = [...new Set(items.map(item => item.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_path')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  return items.map(item => ({
    ...item,
    profiles: profileMap.get(item.user_id) || null,
  }));
}

// Items API
export async function getItems(filters?: {
  type?: 'lost' | 'found';
  status?: 'open' | 'claimed' | 'closed';
  userId?: string;
  limit?: number;
}) {
  let query = supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return enrichItemsWithProfiles(data || []);
}

export async function getItem(itemId: string) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .single();
  if (error) throw error;
  
  const enriched = await enrichItemsWithProfiles([data]);
  return enriched[0];
}

export async function createItem(
  item: Omit<TablesInsert<'items'>, 'id' | 'created_at' | 'image_path'>,
  imageUri?: string
) {
  let imagePath: string | null = null;

  if (imageUri) {
    try {
      imagePath = await uploadItemImage(item.user_id, imageUri);
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  }

  const { data, error } = await supabase
    .from('items')
    .insert({ ...item, image_path: imagePath })
    .select('*')
    .single();
  if (error) throw error;
  
  const enriched = await enrichItemsWithProfiles([data]);
  return enriched[0];
}

export async function updateItem(itemId: string, updates: TablesUpdate<'items'>) {
  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', itemId)
    .select('*')
    .single();
  if (error) throw error;
  
  const enriched = await enrichItemsWithProfiles([data]);
  return enriched[0];
}

export async function claimItem(itemId: string) {
  const { data, error } = await supabase
    .from('items')
    .update({ status: 'claimed' })
    .eq('id', itemId)
    .select('*')
    .single();
  if (error) throw error;
  
  const enriched = await enrichItemsWithProfiles([data]);
  return enriched[0];
}

export async function deleteItem(itemId: string) {
  const { error } = await supabase.from('items').delete().eq('id', itemId);
  if (error) throw error;
}

// Notifications API
export async function getNotifications(userId: string, unreadOnly = false) {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function markNotificationAsRead(notificationId: number) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createNotification(userId: string, message: string) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, message })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Helper function to get image URL
export async function getItemImageUrl(imagePath: string | null): Promise<string | null> {
  if (!imagePath) return null;
  try {
    return await getSignedImageUrl(imagePath);
  } catch (error) {
    console.error('Failed to get image URL:', error);
    return null;
  }
}

