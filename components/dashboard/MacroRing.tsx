import { PieChart } from 'react-native-gifted-charts';
import { Text, View } from 'react-native';

type MacroRingProps = {
  consumed: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
};

export function MacroRing({
  consumed,
  goal,
  size = 220,
  strokeWidth = 18,
  color = '#1DB954',
}: MacroRingProps) {
  const safeGoal = goal > 0 ? goal : 1;
  const pct = Math.max(0, Math.min(1, consumed / safeGoal));
  const remainingPct = 1 - pct;

  const radius = size / 2;
  const innerRadius = radius - strokeWidth;
  const remaining = Math.max(0, goal - consumed);
  const over = consumed > goal;

  // gifted-charts doesn't render an empty arc, so we always provide both slices.
  // When user is over goal, we show full ring in brand color and append a thin
  // overage indicator via the second slice.
  const data = over
    ? [{ value: 1, color }]
    : [
        { value: pct === 0 ? 0.001 : pct, color },
        { value: remainingPct, color: '#262626' },
      ];

  return (
    <View className="items-center">
      <PieChart
        data={data}
        donut
        radius={radius}
        innerRadius={innerRadius}
        backgroundColor="#000000"
        showText={false}
        centerLabelComponent={() => (
          <View className="items-center">
            <Text className="text-fg text-5xl font-bold">
              {Math.round(consumed)}
            </Text>
            <Text className="text-fg-muted mt-1 text-sm">
              of {Math.round(goal)} kcal
            </Text>
            <Text
              className={`mt-2 text-xs font-semibold ${over ? 'text-warning' : 'text-fg-dim'}`}
            >
              {over
                ? `${Math.round(consumed - goal)} kcal over`
                : `${Math.round(remaining)} kcal left`}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
