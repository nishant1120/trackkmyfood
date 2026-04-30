import { Text, View } from 'react-native';

import type { DayBucket } from '@/hooks/useTrends';

type StreakHeatmapProps = {
  days: DayBucket[]; // chronological, oldest→newest
  goalKcal: number;
};

// Color intensity from `pct` (0..1+) — opacity step on the brand green.
function colorFor(day: DayBucket, goalKcal: number): string {
  if (!day.hasFood) return '#1F1F1F';
  if (goalKcal <= 0) return '#1DB95488';
  const pct = Math.min(1.5, day.calories_kcal / goalKcal);
  if (pct < 0.25) return '#1DB95433'; // 20% opacity
  if (pct < 0.5) return '#1DB95466';
  if (pct < 0.85) return '#1DB95499';
  if (pct <= 1.05) return '#1DB954'; // perfect window
  return '#F59E0B'; // over goal
}

export function StreakHeatmap({ days, goalKcal }: StreakHeatmapProps) {
  // Chunk by week (7 days). The list is chronological so the most-recent
  // week is the last column. Grid renders columns of 7 cells (Mon-Sun).
  const weeks: DayBucket[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <View className="flex-row gap-1">
      {weeks.map((week, wi) => (
        <View key={wi} className="gap-1">
          {week.map((day) => (
            <View
              key={day.date}
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                backgroundColor: colorFor(day, goalKcal),
              }}
            />
          ))}
          {/* Pad missing days at the end so the last week aligns */}
          {week.length < 7
            ? Array.from({ length: 7 - week.length }).map((_, i) => (
                <View
                  key={`pad-${i}`}
                  style={{ width: 14, height: 14, borderRadius: 3 }}
                />
              ))
            : null}
        </View>
      ))}
    </View>
  );
}

export function HeatmapLegend() {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-fg-dim text-[10px]">less</Text>
      {['#1F1F1F', '#1DB95433', '#1DB95466', '#1DB95499', '#1DB954'].map((c) => (
        <View
          key={c}
          style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c }}
        />
      ))}
      <Text className="text-fg-dim text-[10px]">more</Text>
    </View>
  );
}
