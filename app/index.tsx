import { Redirect } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isInitialized) return null;
  return isAuthenticated ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/sign-in" />;
}
