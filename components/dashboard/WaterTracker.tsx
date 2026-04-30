import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { haptic } from '@/lib/haptics';

type WaterTrackerProps = {
  consumed_ml: number;
  goal_ml: number;
  onAdd: (amount: number) => void;
  isAdding?: boolean;
};

export function WaterTracker({
  consumed_ml,
  goal_ml,
  onAdd,
  isAdding,
}: WaterTrackerProps) {
  const safeGoal = goal_ml > 0 ? goal_ml : 1;
  const pct = Math.max(0, Math.min(1, consumed_ml / safeGoal));

  return (
    <Card>
      <View className="flex-row items-baseline justify-between">
        <Text className="text-fg-dim text-xs uppercase tracking-button">
          Water
        </Text>
        <Text className="text-fg-muted text-xs">
          {consumed_ml} / {goal_ml} ml
        </Text>
      </View>

      <Text className="text-fg mt-2 text-3xl font-bold">
        {(consumed_ml / 1000).toFixed(2)}
        <Text className="text-fg-dim text-base font-normal"> L</Text>
      </Text>

      <View className="bg-bg-elevated mt-3 h-2 w-full overflow-hidden rounded-pill">
        <View
          className="h-full rounded-pill"
          style={{ width: `${pct * 100}%`, backgroundColor: '#539DF5' }}
        />
      </View>

      <View className="mt-4 flex-row gap-2">
        <WaterButton
          onPress={() => {
            haptic.light();
            onAdd(250);
          }}
          disabled={!!isAdding}
          label="+250ml"
        />
        <WaterButton
          onPress={() => {
            haptic.light();
            onAdd(500);
          }}
          disabled={!!isAdding}
          label="+500ml"
        />
        <WaterButton
          onPress={() => {
            haptic.medium();
            onAdd(1000);
          }}
          disabled={!!isAdding}
          label="+1L"
        />
        {isAdding ? (
          <View className="ml-2 justify-center">
            <ActivityIndicator size="small" color="#539DF5" />
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function WaterButton({
  onPress,
  disabled,
  label,
}: {
  onPress: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`bg-bg-elevated flex-1 items-center justify-center rounded-pill py-3 ${disabled ? 'opacity-50' : 'active:bg-bg-chip'}`}
    >
      <Text className="text-fg text-sm font-semibold">{label}</Text>
    </Pressable>
  );
}
