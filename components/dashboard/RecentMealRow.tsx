import { Pressable, Text, View } from 'react-native';

import type { FoodLog } from '@/lib/types';

type RecentMealRowProps = {
  log: FoodLog;
  onPress?: () => void;
};

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🍛',
  dinner: '🍲',
  snack: '🥜',
};

function pickName(log: FoodLog): string {
  const aiName = (log.ai_food_data as { name?: string } | null)?.name;
  if (aiName) return aiName;
  if (log.notes) return log.notes;
  return 'logged item';
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function RecentMealRow({ log, onPress }: RecentMealRowProps) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      className="bg-bg-elevated flex-row items-center gap-3 rounded-card p-3 active:opacity-80"
    >
      <View className="bg-bg-chip h-12 w-12 items-center justify-center rounded-full">
        <Text className="text-xl">{MEAL_EMOJI[log.meal_type ?? ''] ?? '🍽️'}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-fg text-sm font-semibold" numberOfLines={1}>
          {pickName(log)}
        </Text>
        <Text className="text-fg-dim mt-0.5 text-xs">
          {Math.round(log.quantity)} {log.unit} · {Math.round(log.calories_kcal)} kcal · {formatTime(log.consumed_at)}
        </Text>
      </View>
    </Wrapper>
  );
}
