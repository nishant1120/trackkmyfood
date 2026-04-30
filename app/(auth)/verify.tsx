import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type Status = 'verifying' | 'error';

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function exchange() {
      // Supabase error returned in URL params (expired link, etc.)
      if (params.error) {
        if (!cancelled) {
          setErrorMsg(params.error_description ?? params.error);
          setStatus('error');
        }
        return;
      }

      // On web, detectSessionInUrl handles hash-based tokens automatically;
      // we just need to wait for the auth listener to fire.
      // For PKCE/native we exchange the `code` param explicitly.
      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error && !cancelled) {
          setErrorMsg(error.message);
          setStatus('error');
          return;
        }
      }

      // Whether code-based or hash-based, the auth listener in _layout will
      // pick up the new session and route us. Give it a moment, then bail
      // out if nothing happened.
      const t = setTimeout(async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session) {
          router.replace('/');
        } else {
          setErrorMsg('Could not verify your magic link. Please try again.');
          setStatus('error');
        }
      }, 2500);

      return () => clearTimeout(t);
    }

    exchange();
    return () => {
      cancelled = true;
    };
  }, [params.code, params.error, params.error_description, router]);

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-6">
        {status === 'verifying' ? (
          <>
            <ActivityIndicator size="large" color="#1DB954" />
            <Text className="text-fg text-lg font-semibold">Signing you in…</Text>
            <Text className="text-fg-muted text-center text-sm">
              Verifying your magic link.
            </Text>
          </>
        ) : (
          <>
            <Text className="text-fg text-2xl font-bold">Sign-in failed</Text>
            <Text className="text-fg-muted text-center text-sm">
              {errorMsg ?? 'Something went wrong.'}
            </Text>
            <View className="w-full">
              <Button onPress={() => router.replace('/(auth)/sign-in')}>
                Try again
              </Button>
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}
