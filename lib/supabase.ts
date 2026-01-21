import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fdhyivbysdwebgefjqop.supabase.co";
const supabasePublishableKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkaHlpdmJ5c2R3ZWJnZWZqcW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4OTczOTEsImV4cCI6MjA4MDQ3MzM5MX0.ADX7y8ID7L5TRD8yDkZ-mub1_yxuLmhW18fQLDZww-g";


export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
