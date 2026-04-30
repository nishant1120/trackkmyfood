import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Linking, Platform, Text, View } from 'react-native';
import { z } from 'zod';

import { Button, Input, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type FormValues = z.infer<typeof schema>;

const REDIRECT_URL =
  Platform.OS === 'web'
    ? typeof window !== 'undefined'
      ? `${window.location.origin}/verify`
      : 'http://localhost:8081/verify'
    : 'nutritrack://verify';

export default function SignInScreen() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: FormValues) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: REDIRECT_URL },
    });
    if (error) {
      Alert.alert('Could not send magic link', error.message);
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
                <Text className="text-fg font-semibold">{sentTo}</Text>. Tap the link
                on this device to sign in.
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
            {Platform.OS === 'web' ? null : (
              <Text className="text-fg-dim mt-6 text-center text-xs">
                Tip: open the email on this device. Tapping the link should bounce
                you back into the app.
              </Text>
            )}
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
      </View>
    </Screen>
  );
}
