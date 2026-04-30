import { Text, View } from 'react-native';

import { Button, Card, Screen } from '@/components/ui';
import { useProfile } from '@/hooks/useProfile';
import { bmiCategory, calculateBMI } from '@/lib/nutrition';
import { useAuthStore } from '@/stores/authStore';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { data: profile } = useProfile();

  const bmi = profile ? calculateBMI(profile.weight_kg, profile.height_cm) : null;

  return (
    <Screen>
      <View className="flex-1 gap-4 pt-6">
        <View>
          <Text className="text-fg-muted text-sm">
            Welcome back{profile ? ',' : ''}
          </Text>
          <Text className="text-fg text-4xl font-bold tracking-tight">
            {profile?.full_name ?? 'NutriTrack'}
          </Text>
        </View>

        <Text className="text-fg-muted text-sm">
          Phase 4 will turn this into a Spotify-style daily summary. For now,
          here's the math from your onboarding answers.
        </Text>

        {profile ? (
          <View className="mt-2 gap-3">
            <Card>
              <Text className="text-fg-dim text-xs uppercase tracking-button">
                Daily targets
              </Text>
              <View className="mt-3 flex-row flex-wrap gap-x-6 gap-y-2">
                <Stat label="Calories" value={`${profile.daily_calorie_goal ?? '—'} kcal`} />
                <Stat label="Protein" value={`${profile.daily_protein_goal_g ?? '—'} g`} />
                <Stat label="Carbs" value={`${profile.daily_carbs_goal_g ?? '—'} g`} />
                <Stat label="Fats" value={`${profile.daily_fats_goal_g ?? '—'} g`} />
                <Stat label="Fibre" value={`${profile.daily_fibre_goal_g ?? '—'} g`} />
                <Stat label="Water" value={`${profile.daily_water_goal_ml ?? '—'} ml`} />
              </View>
            </Card>

            {bmi !== null ? (
              <Card>
                <Text className="text-fg-dim text-xs uppercase tracking-button">
                  BMI
                </Text>
                <View className="mt-2 flex-row items-baseline gap-3">
                  <Text className="text-fg text-3xl font-bold">
                    {bmi.toFixed(1)}
                  </Text>
                  <Text className="text-fg-muted text-sm capitalize">
                    {bmiCategory(bmi)}
                  </Text>
                </View>
              </Card>
            ) : null}
          </View>
        ) : null}

        <View className="mt-auto">
          {user ? (
            <Text className="text-fg-dim mb-3 text-xs">{user.email}</Text>
          ) : null}
          <Button variant="secondary" onPress={signOut}>
            Sign out
          </Button>
        </View>
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-fg-dim text-xs">{label}</Text>
      <Text className="text-fg mt-1 text-base font-semibold">{value}</Text>
    </View>
  );
}
