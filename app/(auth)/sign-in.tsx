import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Platform, Text, View } from 'react-native';
import { z } from 'zod';

import { Button, Input, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type FormValues = z.infer<typeof schema>;

const devSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type DevFormValues = z.infer<typeof devSchema>;

// Pre-filled dev credentials so a tap signs you in immediately during testing.
// Only ever rendered when __DEV__ is true.
const DEV_DEFAULTS = {
  email: 'nishant.mishra1120@gmail.com',
  password: 'nutritrack-dev-2026',
};

const REDIRECT_URL =
  Platform.OS === 'web'
    ? typeof window !== 'undefined'
      ? `${window.location.origin}/verify`
      : 'http://localhost:8081/verify'
    : 'nutritrack://verify';

export default function SignInScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  // Already signed in? Offer a continue button instead of asking for email again.
  if (user) {
    return (
      <Screen>
        <View className="flex-1 justify-center">
          <Text className="text-fg text-4xl font-bold tracking-tight">
            Welcome back
          </Text>
          <Text className="text-fg-muted mt-3 text-base">
            You're already signed in as{' '}
            <Text className="text-fg font-semibold">{user.email}</Text>.
          </Text>
          <View className="mt-10 gap-3">
            <Button onPress={() => router.replace('/(tabs)')}>Continue</Button>
            <Button variant="ghost" onPress={signOut}>
              Sign out
            </Button>
          </View>
        </View>
      </Screen>
    );
  }

  const onSubmit = async ({ email }: FormValues) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: REDIRECT_URL },
    });
    if (error) {
      const friendly =
        error.message.toLowerCase().includes('rate limit')
          ? "You've requested too many magic links recently. Please wait a few minutes and try again."
          : error.message;
      Alert.alert('Could not send magic link', friendly);
      return;
    }
    setSentTo(email);
  };

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Text className="text-fg text-4xl font-bold tracking-tight">
          Welcome to NutriTrack
        </Text>
        <Text className="text-fg-muted mt-3 text-base">
          Sign in with a magic link sent to your email.
        </Text>

        {sentTo ? (
          <View className="mt-10">
            <View className="bg-bg-elevated rounded-card p-5">
              <Text className="text-fg text-lg font-semibold">Check your inbox</Text>
              <Text className="text-fg-muted mt-2 text-sm">
                We sent a magic link to{' '}
                <Text className="text-fg font-semibold">{sentTo}</Text>. Open it on
                this device within 5 minutes.
              </Text>
              <Text className="text-fg-dim mt-3 text-xs">
                Tip: some email providers prefetch links and accidentally consume
                them. If clicking does nothing, request a new link and click as
                soon as it lands.
              </Text>
            </View>
            <View className="mt-4">
              <Button
                variant="ghost"
                onPress={() => {
                  setSentTo(null);
                }}
              >
                Use a different email
              </Button>
            </View>
          </View>
        ) : (
          <View className="mt-10 gap-4">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />
            <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting}>
              Send magic link
            </Button>
            {Platform.OS !== 'web' ? (
              <Text className="text-fg-dim mt-2 text-center text-xs">
                You'll receive a link that opens NutriTrack on this device.
              </Text>
            ) : null}
          </View>
        )}

        {__DEV__ && !sentTo ? <DevSignIn /> : null}
      </View>
    </Screen>
  );
}

function DevSignIn() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DevFormValues>({
    resolver: zodResolver(devSchema),
    defaultValues: DEV_DEFAULTS,
  });

  const onSubmit = async ({ email, password }: DevFormValues) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('Dev sign-in failed', error.message);
    }
  };

  return (
    <View className="border-border-dim mt-10 border-t pt-6">
      <Text className="text-fg-dim text-xs uppercase tracking-button">
        Dev sign-in (password)
      </Text>
      <Text className="text-fg-dim mt-1 text-xs">
        Bypasses magic-link rate limits. Only visible in dev builds.
      </Text>
      <View className="mt-4 gap-3">
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              placeholder="email"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              placeholder="password"
              autoCapitalize="none"
              autoComplete="current-password"
              secureTextEntry
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
            />
          )}
        />
        <Button
          variant="secondary"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
        >
          Dev sign in
        </Button>
      </View>
    </View>
  );
}
