import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import type { Database } from './database.types';


const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';


//npx supabase gen types typescript --project-id evpfbuxpvhzmjaasaypw > lib/database.types.ts
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in .env file.");
}
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});