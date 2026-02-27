// ============================================
// 2. lib/supabase.ts - Supabase Client (Updated)
// ============================================

import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

// Custom async adapter for expo-secure-store
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_BIMBO_SUPABASE_URL!;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_BIMBO_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file.\n" +
      "Required: EXPO_PUBLIC_BIMBO_SUPABASE_URL and EXPO_PUBLIC_BIMBO_SUPABASE_PUBLISHABLE_KEY",
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // Use the new JWT signing flow (no need to manually specify JWT secret)
      // Supabase handles this automatically with the publishable key
    },
  },
);
