import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || undefined;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || undefined;

// Don't throw at module-load time. Static export (expo export -p web) evaluates
// every route's transitive imports at build time on the host machine — which
// usually doesn't have our env vars. Use a fallback URL so the client can be
// constructed; any actual network call will then fail with a clear message
// instead of crashing the entire build.
const FALLBACK_URL = 'https://placeholder.supabase.co';
const FALLBACK_KEY = 'placeholder';

if (!supabaseUrl || !supabaseAnonKey) {
  // Console warning, not throw. Surfaces in dev + at SSR build time so the
  // misconfiguration is visible without breaking the build.
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY missing. ' +
      'Falling back to a placeholder client; auth and DB calls will fail until env vars are set.'
  );
}

// Platform-aware storage:
// - native: AsyncStorage (works fine for session tokens; SecureStore has a 2KB
//   limit and Supabase sessions can exceed that)
// - web: localStorage (default Supabase behavior)
const storage = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase = createClient(
  supabaseUrl ?? FALLBACK_URL,
  supabaseAnonKey ?? FALLBACK_KEY,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
  }
);
