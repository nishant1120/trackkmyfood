import { LineChart } from 'react-native-gifted-charts';
import { Text, View } from 'react-native';

import type { WeightPoint } from '@/hooks/useTrends';

type WeightChartProps = {
  weights: WeightPoint[];
  width?: number;
};

export function WeightChart({ weights, width }: WeightChartProps) {
  if (weights.length === 0) {
    return (
      <Text className="text-fg-muted text-sm">
        Log a weight below to start your trend.
      </Text>
    );
  }

  // Use up to the last 30 entries
  const points = weights.slice(-30).map((w) => ({ value: w.weight_kg }));

  const min = Math.min(...points.map((p) => p.value));
  const max = Math.max(...points.map((p) => p.value));
  const pad = Math.max(1, (max - min) * 0.2);
  const yMin = Math.floor(min - pad);
  const yMax = Math.ceil(max + pad);

  return (
    <View>
      <LineChart
        data={points}
        height={120}
        width={width ?? 280}
        thickness={2}
        color="#1DB954"
        startFillColor="#1DB954"
        endFillColor="#000000"
        startOpacity={0.25}
        endOpacity={0}
        areaChart
        hideDataPoints={points.length > 8}
        dataPointsColor="#1DB954"
        dataPointsRadius={3}
        hideRules
        hideYAxisText
        xAxisColor="#1F1F1F"
        yAxisColor="transparent"
        noOfSections={3}
        maxValue={yMax}
        yAxisOffset={yMin}
        initialSpacing={4}
        endSpacing={4}
        spacing={(width ? width - 8 : 280 - 8) / Math.max(1, points.length - 1)}
        backgroundColor="transparent"
      />
      <View className="mt-2 flex-row items-baseline justify-between">
        <Text className="text-fg-dim text-[10px]">
          {weights[0].date}
        </Text>
        <Text className="text-fg-muted text-xs">
          {weights[weights.length - 1].weight_kg.toFixed(1)} kg today
        </Text>
        <Text className="text-fg-dim text-[10px]">
          {weights[weights.length - 1].date}
        </Text>
      </View>
    </View>
  );
}
