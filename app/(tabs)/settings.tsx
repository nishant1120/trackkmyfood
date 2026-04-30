import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  Info,
  LogOut,
  Moon,
  User,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Card, Screen, Segmented } from '@/components/ui';
import { useProfile, useUpsertProfile } from '@/hooks/useProfile';
import {
  disableMealReminders,
  enableMealReminders,
} from '@/lib/notifications';
import type { Theme } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

export default function SettingsTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const { data: profile } = useProfile();
  const upsertProfile = useUpsertProfile();

  const [remindersOn, setRemindersOn] = useState(false);
  const [savingReminders, setSavingReminders] = useState(false);

  // Initialize reminder toggle from profile.notifications_enabled
  useEffect(() => {
    if (profile) setRemindersOn(profile.notifications_enabled ?? false);
  }, [profile]);

  const onToggleReminders = async (next: boolean) => {
    setSavingReminders(true);
    setRemindersOn(next);
    try {
      if (next) {
        const r = await enableMealReminders();
        if (r.kind === 'denied') {
          Alert.alert(
            'Notifications blocked',
            'Allow notifications in Settings to receive meal reminders.'
          );
          setRemindersOn(false);
          return;
        }
        if (r.kind === 'unsupported') {
          Alert.alert(
            'Not available on web',
            'Meal reminders are available on iOS and Android. The toggle stays as a preference for when you open the app on a phone.'
          );
        }
        if (r.kind === 'error') {
          Alert.alert('Could not schedule reminders', r.message);
          setRemindersOn(false);
          return;
        }
      } else {
        await disableMealReminders();
      }

      // Persist preference to the profile so it survives across devices.
      if (profile) {
        try {
          await upsertProfile.mutateAsync({
            email: profile.email,
            full_name: profile.full_name,
            age: profile.age,
            gender: profile.gender,
            height_cm: profile.height_cm,
            weight_kg: profile.weight_kg,
            activity_level: profile.activity_level,
            medical_conditions: profile.medical_conditions,
            dietary_preferences: profile.dietary_preferences,
            daily_calorie_goal: profile.daily_calorie_goal,
            daily_protein_goal_g: profile.daily_protein_goal_g,
            daily_carbs_goal_g: profile.daily_carbs_goal_g,
            daily_fats_goal_g: profile.daily_fats_goal_g,
            daily_fibre_goal_g: profile.daily_fibre_goal_g,
            daily_water_goal_ml: profile.daily_water_goal_ml,
            theme: profile.theme,
            notifications_enabled: next,
          });
        } catch {
          // Non-fatal — local state still toggled.
        }
      }
    } finally {
      setSavingReminders(false);
    }
  };

  const onSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerClassName="px-6 pt-6 pb-10 gap-4">
        <View>
          <Text className="text-fg text-3xl font-bold tracking-tight">
            Settings
          </Text>
          <Text className="text-fg-muted mt-1 text-sm">
            {user?.email ?? '—'}
          </Text>
        </View>

        {/* Profile */}
        <Pressable
          onPress={() => router.push('/settings/profile')}
          className="active:opacity-80"
        >
          <Card>
            <View className="flex-row items-center gap-4">
              <IconBubble>
                <User size={20} color="#1DB954" />
              </IconBubble>
              <View className="flex-1">
                <Text className="text-fg text-base font-semibold">
                  Profile
                </Text>
                <Text className="text-fg-muted mt-0.5 text-xs" numberOfLines={1}>
                  {profile?.full_name ?? '—'} · {profile?.weight_kg ?? '—'} kg ·{' '}
                  {profile?.activity_level ?? '—'}
                </Text>
              </View>
              <ChevronRight size={18} color="#7C7C7C" />
            </View>
          </Card>
        </Pressable>

        {/* Theme */}
        <Card>
          <View className="flex-row items-center gap-4">
            <IconBubble>
              <Moon size={20} color="#8B5CF6" />
            </IconBubble>
            <View className="flex-1">
              <Text className="text-fg text-base font-semibold">Theme</Text>
              <Text className="text-fg-muted mt-0.5 text-xs">
                Saved as a preference. Light mode polish lands soon.
              </Text>
            </View>
          </View>
          <View className="mt-3">
            <Segmented
              options={THEME_OPTIONS}
              value={theme}
              onChange={(v) => setTheme(v)}
            />
          </View>
        </Card>

        {/* Reminders */}
        <Card>
          <View className="flex-row items-start gap-4">
            <IconBubble>
              <Bell size={20} color="#F59E0B" />
            </IconBubble>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-fg text-base font-semibold">
                  Meal reminders
                </Text>
                <Pressable
                  onPress={() => !savingReminders && onToggleReminders(!remindersOn)}
                  disabled={savingReminders}
                >
                  <View
                    className={`h-7 w-12 justify-center rounded-pill ${remindersOn ? 'bg-brand' : 'bg-bg-chip'}`}
                  >
                    <View
                      className={`h-5 w-5 rounded-full bg-white ${remindersOn ? 'ml-6' : 'ml-1'}`}
                    />
                  </View>
                </Pressable>
              </View>
              <Text className="text-fg-muted mt-1 text-xs leading-relaxed">
                Daily nudges at 8am, 1pm, and 8pm to log breakfast, lunch, and
                dinner.
                {Platform.OS === 'web'
                  ? ' Available on iOS and Android only.'
                  : ''}
              </Text>
            </View>
          </View>
        </Card>

        {/* About */}
        <Pressable
          onPress={() => router.push('/settings/about')}
          className="active:opacity-80"
        >
          <Card>
            <View className="flex-row items-center gap-4">
              <IconBubble>
                <Info size={20} color="#539DF5" />
              </IconBubble>
              <View className="flex-1">
                <Text className="text-fg text-base font-semibold">
                  About & privacy
                </Text>
                <Text className="text-fg-muted mt-0.5 text-xs">
                  Data sources, version, feedback.
                </Text>
              </View>
              <ChevronRight size={18} color="#7C7C7C" />
            </View>
          </Card>
        </Pressable>

        {/* Sign out */}
        <Pressable onPress={onSignOut} className="active:opacity-80">
          <Card>
            <View className="flex-row items-center gap-4">
              <IconBubble>
                <LogOut size={20} color="#EF4444" />
              </IconBubble>
              <View className="flex-1">
                <Text className="text-danger text-base font-semibold">
                  Sign out
                </Text>
              </View>
            </View>
          </Card>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function IconBubble({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-bg-chip h-11 w-11 items-center justify-center rounded-full">
      {children}
    </View>
  );
}
