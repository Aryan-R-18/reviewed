import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

// We create a custom storage adapter so users stay logged in when they close the app!
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

// ⚠️ REPLACE THESE WITH YOUR ACTUAL URL AND KEY FROM SUPABASE
const supabaseUrl = 'https://pbjuggirnpztqlmygjmb.supabase.co';
const supabaseAnonKey = 'sb_publishable_o9y6simpP3MQb6KLGuVWYw_EIWeOBPA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});