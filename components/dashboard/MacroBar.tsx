import { Text, View } from 'react-native';

type MacroBarProps = {
  label: string;
  consumed: number;
  goal: number;
  color: string;
  unit?: string;
};

export function MacroBar({
  label,
  consumed,
  goal,
  color,
  unit = 'g',
}: MacroBarProps) {
  const safeGoal = goal > 0 ? goal : 1;
  const pct = Math.max(0, Math.min(1, consumed / safeGoal));
  return (
    <View className="flex-1">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-fg-muted text-xs uppercase tracking-button">
          {label}
        </Text>
        <Text className="text-fg-dim text-xs">
          {Math.round(consumed)}/{Math.round(goal)}{unit}
        </Text>
      </View>
      <View className="bg-bg-elevated mt-2 h-1.5 w-full overflow-hidden rounded-pill">
        <View
          className="h-full rounded-pill"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}
