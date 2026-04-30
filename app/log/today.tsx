import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecentMealRow } from '@/components/dashboard/RecentMealRow';
import { Card } from '@/components/ui';
import { useDailyTotals } from '@/hooks/useDailyTotals';
import type { FoodLog, MealType } from '@/lib/types';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export default function TodayLogsScreen() {
  const router = useRouter();
  const { data: totals, isLoading } = useDailyTotals();

  const grouped = groupByMeal(totals?.food_logs ?? []);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-pill active:bg-bg-elevated"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-fg text-lg font-semibold">Today</Text>
          <Text className="text-fg-muted text-xs">
            {totals?.food_logs.length ?? 0} entries · {Math.round(totals?.calories_kcal ?? 0)} kcal
          </Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-6 pt-2 pb-10 gap-6">
        {isLoading ? null : totals && totals.food_logs.length === 0 ? (
          <Card>
            <Text className="text-fg-muted text-sm">
              Nothing logged today yet.
            </Text>
          </Card>
        ) : (
          MEAL_ORDER.map((meal) => {
            const items = grouped[meal] ?? [];
            if (items.length === 0) return null;
            const mealKcal = items.reduce(
              (s, l) => s + (Number(l.calories_kcal) || 0),
              0
            );
            return (
              <View key={meal}>
                <View className="mb-3 flex-row items-baseline justify-between">
                  <Text className="text-fg text-base font-semibold">
                    {MEAL_LABEL[meal]}
                  </Text>
                  <Text className="text-fg-dim text-xs">
                    {Math.round(mealKcal)} kcal
                  </Text>
                </View>
                <View className="gap-2">
                  {items.map((log) => (
                    <RecentMealRow key={log.id} log={log} />
                  ))}
                </View>
              </View>
            );
          })
        )}

        {/* Catch-all for logs missing a meal_type */}
        {grouped.uncategorized.length > 0 ? (
          <View>
            <Text className="text-fg mb-3 text-base font-semibold">Other</Text>
            <View className="gap-2">
              {grouped.uncategorized.map((log) => (
                <RecentMealRow key={log.id} log={log} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function groupByMeal(logs: FoodLog[]): Record<MealType, FoodLog[]> & {
  uncategorized: FoodLog[];
} {
  const acc: Record<MealType, FoodLog[]> & { uncategorized: FoodLog[] } = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
    uncategorized: [],
  };
  for (const log of logs) {
    if (log.meal_type && log.meal_type in acc) {
      acc[log.meal_type].push(log);
    } else {
      acc.uncategorized.push(log);
    }
  }
  // Sort newest first within each meal
  for (const k of Object.keys(acc) as (keyof typeof acc)[]) {
    acc[k].sort(
      (a, b) =>
        new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime()
    );
  }
  return acc;
}
