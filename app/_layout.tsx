import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';
import '../global.css';

import { initSentry } from '@/lib/sentry';
initSentry();

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

function AuthGate({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const segments = useSegments();
  const router = useRouter();
  const profileQuery = useProfile();

  const hydrateTheme = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    initialize();
    hydrateTheme();
  }, [initialize, hydrateTheme]);

  // Native: handle deep links (e.g. nutritrack://verify?code=...)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleUrl = async (url: string) => {
      const parsed = Linking.parse(url);
      if (parsed.path !== 'verify') return;
      const code = parsed.queryParams?.code as string | undefined;
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace('/');
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (!isInitialized) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === '(auth)';
    const inOnboardingGroup = firstSegment === '(onboarding)';

    // Not authed → sign-in
    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace('/(auth)/sign-in');
      return;
    }

    // Authed: wait until profile fetch resolves before deciding where to go
    if (profileQuery.isLoading) return;

    const hasProfile = !!profileQuery.data;

    if (!hasProfile && !inOnboardingGroup) {
      router.replace('/(onboarding)/profile-setup');
    } else if (hasProfile && (inAuthGroup || inOnboardingGroup)) {
      router.replace('/(tabs)');
    }
  }, [
    isInitialized,
    isAuthenticated,
    profileQuery.isLoading,
    profileQuery.data,
    segments,
    router,
  ]);

  // Loading: pre-init OR (authed but profile still loading and we're not yet
  // on a screen that can render without it)
  const showSpinner =
    !isInitialized || (isAuthenticated && profileQuery.isLoading);

  if (showSpinner) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 1000 * 60, retry: 1 },
        },
      })
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGate>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#000000' },
              }}
            />
          </AuthGate>
          <StatusBar style="light" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
