import { useRouter } from 'expo-router';
import { Flame } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { BMICard } from '@/components/dashboard/BMICard';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { MacroBar } from '@/components/dashboard/MacroBar';
import { MacroRing } from '@/components/dashboard/MacroRing';
import {
  MICRONUTRIENT_DEFAULTS,
  MicronutrientStrip,
} from '@/components/dashboard/MicronutrientStrip';
import { RecentMealRow } from '@/components/dashboard/RecentMealRow';
import { WaterTracker } from '@/components/dashboard/WaterTracker';
import { Card, Screen } from '@/components/ui';
import { useDailyTotals } from '@/hooks/useDailyTotals';
import { useInsights } from '@/hooks/useInsights';
import { useProfile } from '@/hooks/useProfile';
import { useStreak } from '@/hooks/useStreak';
import { useAddWater } from '@/hooks/useWaterLogs';
import { calculateBMI } from '@/lib/nutrition';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Late night';
}

export default function Dashboard() {
  const router = useRouter();
  const profileQuery = useProfile();
  const totalsQuery = useDailyTotals();
  const streakQuery = useStreak();
  const addWater = useAddWater();
  const insightsQuery = useInsights({
    profile: profileQuery.data,
    totals: totalsQuery.data,
  });

  const profile = profileQuery.data;
  const totals = totalsQuery.data;
  const streak = streakQuery.data;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      profileQuery.refetch(),
      totalsQuery.refetch(),
      streakQuery.refetch(),
      insightsQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const calorieGoal = profile?.daily_calorie_goal ?? 2000;
  const bmi =
    profile?.weight_kg && profile?.height_cm
      ? calculateBMI(profile.weight_kg, profile.height_cm)
      : null;

  const insightsState =
    !insightsQuery.data && insightsQuery.isLoading
      ? ({ kind: 'loading' } as const)
      : insightsQuery.data?.kind === 'ok'
        ? ({
            kind: 'ok',
            data: insightsQuery.data.data,
            cached: insightsQuery.data.cached,
          } as const)
        : insightsQuery.data?.kind === 'error'
          ? ({ kind: 'error', message: insightsQuery.data.message } as const)
          : ({ kind: 'loading' } as const);

  const micronutrients = totals
    ? [
        {
          label: MICRONUTRIENT_DEFAULTS.vitamin_a.label,
          consumed: totals.vitamin_a_mcg,
          goal: MICRONUTRIENT_DEFAULTS.vitamin_a.goal,
          unit: MICRONUTRIENT_DEFAULTS.vitamin_a.unit,
        },
        {
          label: MICRONUTRIENT_DEFAULTS.vitamin_c.label,
          consumed: totals.vitamin_c_mg,
          goal: MICRONUTRIENT_DEFAULTS.vitamin_c.goal,
          unit: MICRONUTRIENT_DEFAULTS.vitamin_c.unit,
        },
        {
          label: MICRONUTRIENT_DEFAULTS.vitamin_d.label,
          consumed: totals.vitamin_d_mcg,
          goal: MICRONUTRIENT_DEFAULTS.vitamin_d.goal,
          unit: MICRONUTRIENT_DEFAULTS.vitamin_d.unit,
        },
        {
          label: MICRONUTRIENT_DEFAULTS.vitamin_b12.label,
          consumed: totals.vitamin_b12_mcg,
          goal: MICRONUTRIENT_DEFAULTS.vitamin_b12.goal,
          unit: MICRONUTRIENT_DEFAULTS.vitamin_b12.unit,
        },
        {
          label: MICRONUTRIENT_DEFAULTS.iron.label,
          consumed: totals.iron_mg,
          goal: MICRONUTRIENT_DEFAULTS.iron.goal,
          unit: MICRONUTRIENT_DEFAULTS.iron.unit,
        },
        {
          label: MICRONUTRIENT_DEFAULTS.calcium.label,
          consumed: totals.calcium_mg,
          goal: MICRONUTRIENT_DEFAULTS.calcium.goal,
          unit: MICRONUTRIENT_DEFAULTS.calcium.unit,
        },
      ]
    : [];

  const recentMeals = totals?.food_logs.slice(0, 3) ?? [];

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerClassName="px-6 pt-4 pb-10 gap-5"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1DB954"
          />
        }
      >
        {/* Greeting + streak */}
        <View className="flex-row items-end justify-between">
          <View className="flex-1">
            <Text className="text-fg-muted text-sm">{greeting()},</Text>
            <Text className="text-fg text-3xl font-bold tracking-tight" numberOfLines={1}>
              {profile?.full_name ?? 'there'}
            </Text>
          </View>
          {streak && streak.currentStreak > 0 ? (
            <View className="bg-bg-elevated flex-row items-center gap-1.5 rounded-pill px-3 py-2">
              <Flame size={14} color="#F59E0B" />
              <Text className="text-fg text-xs font-semibold">
                {streak.currentStreak}-day streak
              </Text>
            </View>
          ) : null}
        </View>

        {/* Calorie ring */}
        <View className="my-2 items-center">
          <MacroRing
            consumed={totals?.calories_kcal ?? 0}
            goal={calorieGoal}
          />
        </View>

        {/* Macro bars */}
        <Card>
          <View className="gap-4">
            <MacroBar
              label="Protein"
              consumed={totals?.protein_g ?? 0}
              goal={profile?.daily_protein_goal_g ?? 0}
              color="#1DB954"
            />
            <MacroBar
              label="Carbs"
              consumed={totals?.carbs_g ?? 0}
              goal={profile?.daily_carbs_goal_g ?? 0}
              color="#F59E0B"
            />
            <MacroBar
              label="Fats"
              consumed={totals?.fats_g ?? 0}
              goal={profile?.daily_fats_goal_g ?? 0}
              color="#EF4444"
            />
            <MacroBar
              label="Fibre"
              consumed={totals?.fibre_g ?? 0}
              goal={profile?.daily_fibre_goal_g ?? 0}
              color="#8B5CF6"
            />
          </View>
        </Card>

        {/* BMI */}
        {bmi !== null ? <BMICard bmi={bmi} /> : null}

        {/* Micronutrients */}
        <View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-fg text-sm font-semibold">
              Vitamins & Minerals
            </Text>
            <Text className="text-fg-dim text-xs">vs. RDA</Text>
          </View>
          <MicronutrientStrip items={micronutrients} />
        </View>

        {/* Water */}
        <WaterTracker
          consumed_ml={totals?.water_ml ?? 0}
          goal_ml={profile?.daily_water_goal_ml ?? 2500}
          onAdd={(ml) => addWater.mutate(ml)}
          isAdding={addWater.isPending}
        />

        {/* AI insights */}
        <InsightCard state={insightsState} />

        {/* Recent meals */}
        {recentMeals.length > 0 ? (
          <View>
            <View className="mb-3 flex-row items-baseline justify-between">
              <Text className="text-fg text-sm font-semibold">Recent meals</Text>
              {(totals?.food_logs.length ?? 0) > 3 ? (
                <Pressable onPress={() => router.push('/log/today')} hitSlop={8}>
                  <Text className="text-brand text-xs font-semibold">
                    View all ({totals?.food_logs.length})
                  </Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => router.push('/log/today')} hitSlop={8}>
                  <Text className="text-fg-dim text-xs font-semibold">
                    View all
                  </Text>
                </Pressable>
              )}
            </View>
            <View className="gap-2">
              {recentMeals.map((m) => (
                <RecentMealRow key={m.id} log={m} />
              ))}
            </View>
          </View>
        ) : (
          <Card>
            <Text className="text-fg-muted text-sm">
              No meals logged yet today. Tap{' '}
              <Text className="text-fg font-semibold">Log</Text> to get started.
            </Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
