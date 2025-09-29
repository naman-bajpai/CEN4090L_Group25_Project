import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';



const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
throw new Error("Supabase URL and Anon Key must be provided in .env file.");
}

// Create the Supabase client with TypeScript types for your database.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);