import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type Status = 'verifying' | 'error';

type HashPayload = {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

// Supabase magic-link redirects put tokens (or errors) in the URL fragment:
//   /verify#access_token=...&refresh_token=...&type=magiclink
//   /verify#error=access_denied&error_code=otp_expired&error_description=...
function parseHash(): HashPayload {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return {};
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return {};
  const params = new URLSearchParams(hash);
  const out: HashPayload = {};
  for (const key of [
    'access_token',
    'refresh_token',
    'error',
    'error_description',
  ] as const) {
    const v = params.get(key);
    if (v) out[key] = v;
  }
  return out;
}

function humanizeError(code: string | undefined, description: string | undefined) {
  if (description) return description.replace(/\+/g, ' ');
  if (code === 'otp_expired') return 'This magic link has expired. Request a new one.';
  if (code === 'access_denied') return 'Access denied. Try requesting a new magic link.';
  return 'Could not verify your magic link. Please try again.';
}

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function exchange() {
      const hash = parseHash();

      // 1) Error signaled in URL (query OR hash)
      const urlError = params.error ?? hash.error;
      const urlErrorDesc = params.error_description ?? hash.error_description;
      if (urlError) {
        if (!cancelled) {
          setErrorMsg(humanizeError(urlError, urlErrorDesc));
          setStatus('error');
        }
        return;
      }

      // 2) Implicit flow (default for email magic links): tokens in fragment.
      if (hash.access_token && hash.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: hash.access_token,
          refresh_token: hash.refresh_token,
        });
        if (cancelled) return;
        if (error) {
          setErrorMsg(error.message);
          setStatus('error');
          return;
        }
        // Clean tokens out of the URL bar before bouncing.
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.history.replaceState(null, '', window.location.pathname);
        }
        router.replace('/');
        return;
      }

      // 3) PKCE flow / native deep link: ?code=...
      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (cancelled) return;
        if (error) {
          setErrorMsg(error.message);
          setStatus('error');
          return;
        }
        router.replace('/');
        return;
      }

      // 4) Nothing usable in the URL. Give detectSessionInUrl a moment in case
      // the SDK is still processing, then give up.
      const t = setTimeout(async () => {
        if (cancelled) return;
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session) {
          router.replace('/');
        } else {
          setErrorMsg('No verification info found in the link. Please try again.');
          setStatus('error');
        }
      }, 2000);

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
