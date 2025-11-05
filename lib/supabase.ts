import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

type Extra = { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string } | undefined;

// works on SDK 51/52 (native & web)
const extra: Extra = (Constants as any)?.expoConfig?.extra ?? (Constants as any)?.manifest?.extra;

const SUPABASE_URL =
  extra?.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';

const SUPABASE_ANON_KEY =
  extra?.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// quick visibility in Metro/console
// (remove after it works)
console.log('Supabase URL present?', !!SUPABASE_URL, 'Anon key present?', !!SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
