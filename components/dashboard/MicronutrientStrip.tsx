import { ScrollView, Text, View } from 'react-native';

type Item = {
  label: string;
  consumed: number;
  goal: number;
  unit: string;
};

type MicronutrientStripProps = {
  items: Item[];
};

// RDA defaults (Indian DRI / WHO blended), per day, per the spec's 6-nutrient list.
// Used as fallbacks when we don't have user-specific goals.
export const MICRONUTRIENT_DEFAULTS = {
  vitamin_a: { label: 'Vit A', goal: 900, unit: 'mcg' },
  vitamin_c: { label: 'Vit C', goal: 90, unit: 'mg' },
  vitamin_d: { label: 'Vit D', goal: 15, unit: 'mcg' },
  vitamin_b12: { label: 'B12', goal: 2.4, unit: 'mcg' },
  iron: { label: 'Iron', goal: 18, unit: 'mg' },
  calcium: { label: 'Calcium', goal: 1000, unit: 'mg' },
} as const;

export function MicronutrientStrip({ items }: MicronutrientStripProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3"
    >
      {items.map((it) => {
        const safeGoal = it.goal > 0 ? it.goal : 1;
        const pct = Math.max(0, Math.min(1, it.consumed / safeGoal));
        return (
          <View
            key={it.label}
            className="bg-bg-elevated min-w-[110px] rounded-card p-3"
          >
            <Text className="text-fg-muted text-xs uppercase tracking-button">
              {it.label}
            </Text>
            <Text className="text-fg mt-2 text-base font-semibold">
              {round(it.consumed)}
              <Text className="text-fg-dim text-xs font-normal"> /{round(it.goal)} {it.unit}</Text>
            </Text>
            <View className="bg-bg-card mt-2 h-1 w-full overflow-hidden rounded-pill">
              <View
                className="bg-brand h-full rounded-pill"
                style={{ width: `${pct * 100}%` }}
              />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function round(n: number): string {
  if (n >= 100) return String(Math.round(n));
  return String(Math.round(n * 10) / 10);
}
