import OpenAI from 'openai';
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
      console.log('Image uploaded successfully:', imagePath);
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      // Re-throw the error so the user knows the upload failed
      throw new Error(`Failed to upload image: ${error.message || 'Unknown error'}`);
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

// Notifications API - DISABLED
export async function getNotifications(userId: string, unreadOnly = false) {
  // Notifications feature disabled
  return [];
}

export async function markNotificationAsRead(notificationId: number) {
  // Notifications feature disabled
  return null;
}

export async function createNotification(userId: string, message: string) {
  // Notifications feature disabled - no-op
  return null;
}

// Helper function to get image URL
export async function getItemImageUrl(imagePath: string | null): Promise<string | null> {
  if (!imagePath) return null;
  try {
    return await getSignedImageUrl(imagePath);
  } catch (error: any) {
    // Silently fail - image might not exist or user might not have permission
    // This is expected for items uploaded by other users if storage policies are restrictive
    console.error('Failed to get image URL:', error?.message || error);
    return null;
  }
}

// AI Search API
export type ItemWithProfile = Tables<'items'> & {
  profiles: { full_name: string | null; avatar_path: string | null } | null;
};

export type ItemWithMatchScore = ItemWithProfile & {
  matchScore: number;
};

// Initialize OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please set EXPO_PUBLIC_OPENAI_API_KEY in your environment variables.');
  }
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// AI-powered search that matches user description to lost items
export async function searchLostItemsWithAI(
  searchQuery: string,
  options?: { limit?: number; minScore?: number }
): Promise<ItemWithMatchScore[]> {
  if (!searchQuery.trim()) {
    return [];
  }

  try {
    // Get all lost items
    const allItems = await getItems({ type: 'lost', status: 'open' }) as ItemWithProfile[];
    
    if (allItems.length === 0) {
      return [];
    }

    // Initialize OpenAI client
    const openai = getOpenAIClient();

    // Get embedding for the search query
    const queryEmbeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: searchQuery,
    });
    const queryEmbedding = queryEmbeddingResponse.data[0].embedding;

    // Get embeddings for all items and calculate similarity
    const itemsWithScores: ItemWithMatchScore[] = [];

    // Process items in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < allItems.length; i += batchSize) {
      const batch = allItems.slice(i, i + batchSize);
      
      // Create text representation of each item for embedding
      const itemTexts = batch.map(item => {
        const parts = [item.title];
        if (item.description) parts.push(item.description);
        if (item.color) parts.push(`Color: ${item.color}`);
        if (item.location) parts.push(`Location: ${item.location}`);
        return parts.join('. ');
      });

      // Get embeddings for the batch
      const embeddingsResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: itemTexts,
      });

      // Calculate similarity scores
      embeddingsResponse.data.forEach((embeddingData: { embedding: number[] }, index: number) => {
        const similarity = cosineSimilarity(queryEmbedding, embeddingData.embedding);
        const item = batch[index];
        
        itemsWithScores.push({
          ...item,
          matchScore: similarity,
        });
      });
    }

    // Sort by match score (highest first)
    itemsWithScores.sort((a, b) => b.matchScore - a.matchScore);

    // Apply filters
    const minScore = options?.minScore ?? 0.3; // Default minimum similarity threshold
    const limit = options?.limit ?? 20;

    return itemsWithScores
      .filter(item => item.matchScore >= minScore)
      .slice(0, limit);
  } catch (error: any) {
    console.error('AI search error:', error);
    
    // Fallback to simple text search if AI fails
    if (error.message?.includes('API key')) {
      throw new Error('OpenAI API key not configured. Please set EXPO_PUBLIC_OPENAI_API_KEY.');
    }
    
    // Fallback: simple text matching
    const allItems = await getItems({ type: 'lost', status: 'open' }) as ItemWithProfile[];
    const queryLower = searchQuery.toLowerCase();
    
    return allItems
      .map(item => {
        const itemText = [
          item.title,
          item.description,
          item.color,
          item.location,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        
        // Simple keyword matching score
        const keywords = queryLower.split(/\s+/);
        const matches = keywords.filter(keyword => itemText.includes(keyword)).length;
        const matchScore = matches / keywords.length;
        
        return { ...item, matchScore };
      })
      .filter(item => item.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, options?.limit ?? 20) as ItemWithMatchScore[];
  }
}

// Messages API
export type Message = {
  id: string;
  item_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read: boolean;
  sender_profile?: { full_name: string | null; avatar_path: string | null } | null;
  receiver_profile?: { full_name: string | null; avatar_path: string | null } | null;
};

export async function sendMessage(
  itemId: string,
  receiverId: string,
  message: string
) {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    throw new Error('You must be logged in to send messages');
  }

  const { data, error } = await (supabase as any)
    .from('messages')
    .insert({
      item_id: itemId,
      sender_id: session.session.user.id,
      receiver_id: receiverId,
      message: message.trim(),
    })
    .select()
    .single();

  if (error) throw error;

  // Notifications feature disabled

  return data;
}

export async function getMessages(itemId: string, userId: string) {
  const { data, error } = await (supabase as any)
    .from('messages')
    .select('*')
    .eq('item_id', itemId)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Enrich with profile data
  if (data && data.length > 0) {
    const userIds: string[] = Array.from(
      new Set(data.flatMap((m: any) => [m.sender_id, m.receiver_id] as string[]))
    );
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_path')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    return data.map((message: any) => ({
      ...message,
      sender_profile: profileMap.get(message.sender_id) || null,
      receiver_profile: profileMap.get(message.receiver_id) || null,
    })) as Message[];
  }

  return [] as Message[];
}

export async function markMessageAsRead(messageId: string) {
  const { data, error } = await (supabase as any)
    .from('messages')
    .update({ read: true })
    .eq('id', messageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getConversations(userId: string) {
  // Get all unique conversations (grouped by item_id and other participant)
  const { data, error } = await (supabase as any)
    .from('messages')
    .select('*, items!inner(id, title, type, status)')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Group by item_id and get the latest message for each conversation
  const conversationMap = new Map();
  const userIds = new Set<string>();

  data?.forEach((message: any) => {
    const otherUserId =
      message.sender_id === userId ? message.receiver_id : message.sender_id;
    const key = `${message.item_id}_${otherUserId}`;

    if (!conversationMap.has(key)) {
      // Initialize conversation with the first message encountered (newest due to DESC order)
      // Count this message if it's unread
      const initialUnreadCount = (!message.read && message.receiver_id === userId) ? 1 : 0;
      conversationMap.set(key, {
        item_id: message.item_id,
        item: message.items,
        other_user_id: otherUserId,
        last_message: message,
        unread_count: initialUnreadCount,
      });
      userIds.add(otherUserId);
    } else {
      const conv = conversationMap.get(key);
      // Update last_message if this message is newer
      if (message.created_at && conv.last_message.created_at && 
          new Date(message.created_at) > new Date(conv.last_message.created_at)) {
        // If the old last_message was unread and we're replacing it, we need to adjust
        // But since we're counting all unread messages, we just update last_message
        // and continue counting unread messages below
        conv.last_message = message;
      }
      // Count ALL unread messages (not just the newest one)
      // This ensures older unread messages are counted even if newest is read
      if (!message.read && message.receiver_id === userId) {
        conv.unread_count++;
      }
    }
  });

  // Get profiles for other users
  if (userIds.size > 0) {
    const userIdArray: string[] = Array.from(userIds);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_path')
      .in('id', userIdArray);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    return Array.from(conversationMap.values()).map((conv: any) => ({
      ...conv,
      other_user_profile: profileMap.get(conv.other_user_id) || null,
    }));
  }

  return [];
}

// ============================================
// ADMIN API FUNCTIONS
// ============================================

/**
 * Check if the current user is an admin
 */
export async function checkIsAdmin(): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) {
    return false;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.session.user.id)
    .maybeSingle();

  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }

  return profile?.role === 'admin';
}

/**
 * Get all students (admin only)
 * Returns all profiles with their information
 */
export async function getAllStudents() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Only admins can view all students');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Admin function to update any item (admin only)
 */
export async function adminUpdateItem(itemId: string, updates: TablesUpdate<'items'>) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Only admins can update any item');
  }

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

/**
 * Admin function to delete any item (admin only)
 */
export async function adminDeleteItem(itemId: string) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Only admins can delete any item');
  }

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

/**
 * Admin function to delete a student profile (admin only)
 * This will also delete the user's auth account if needed
 */
export async function adminDeleteStudent(userId: string) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Only admins can delete students');
  }

  // Call the database function
  const { data, error } = await supabase.rpc('admin_delete_profile', {
    target_user_id: userId,
  });

  if (error) throw error;
  return data;
}

/**
 * Admin function to verify a student (admin only)
 */
export async function adminVerifyStudent(userId: string) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Only admins can verify students');
  }

  // Call the database function
  const { data, error } = await supabase.rpc('admin_verify_student', {
    target_user_id: userId,
  });

  if (error) throw error;

  // Return updated profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) throw profileError;
  return profile;
}

/**
 * Admin function to unverify a student (admin only)
 */
export async function adminUnverifyStudent(userId: string) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Only admins can unverify students');
  }

  // Call the database function
  const { data, error } = await supabase.rpc('admin_unverify_student', {
    target_user_id: userId,
  });

  if (error) throw error;

  // Return updated profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) throw profileError;
  return profile;
}

/**
 * Admin function to get all items (admin only)
 * Returns all items regardless of status or ownership
 */
export async function adminGetAllItems(filters?: {
  type?: 'lost' | 'found';
  status?: 'open' | 'claimed' | 'closed';
  limit?: number;
}) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Only admins can view all items');
  }

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
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return enrichItemsWithProfiles(data || []);
}

/**
 * Admin function to update a student profile (admin only)
 * Allows admins to update any profile including role and verified status
 */
export async function adminUpdateStudent(userId: string, updates: TablesUpdate<'profiles'>) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Only admins can update student profiles');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

