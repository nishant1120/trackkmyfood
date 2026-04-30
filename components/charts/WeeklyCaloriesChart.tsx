import { BarChart } from 'react-native-gifted-charts';
import { Text, View } from 'react-native';

import type { DayBucket } from '@/hooks/useTrends';

type WeeklyCaloriesChartProps = {
  days: DayBucket[]; // expect last 7 entries chronological
  goalKcal: number;
  width?: number;
};

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function dowFor(date: string): string {
  const d = new Date(date);
  return DOW[d.getDay()];
}

export function WeeklyCaloriesChart({
  days,
  goalKcal,
  width,
}: WeeklyCaloriesChartProps) {
  const last7 = days.slice(-7);
  const data = last7.map((d) => ({
    value: Math.round(d.calories_kcal),
    label: dowFor(d.date),
    frontColor: d.hasFood ? '#1DB954' : '#1F1F1F',
    topLabelComponent: () =>
      d.calories_kcal > 0 ? (
        <Text style={{ color: '#7C7C7C', fontSize: 10, marginBottom: 2 }}>
          {Math.round(d.calories_kcal)}
        </Text>
      ) : null,
  }));

  const maxFromData = Math.max(...data.map((d) => d.value), goalKcal || 0);
  const maxValue = Math.ceil((maxFromData * 1.2) / 500) * 500 || 2500;

  return (
    <View>
      <BarChart
        data={data}
        height={160}
        width={width ?? 280}
        barWidth={22}
        spacing={10}
        initialSpacing={10}
        endSpacing={10}
        roundedTop
        hideRules
        xAxisColor="#1F1F1F"
        yAxisColor="transparent"
        xAxisLabelTextStyle={{ color: '#7C7C7C', fontSize: 10 }}
        yAxisTextStyle={{ color: 'transparent' }}
        noOfSections={4}
        maxValue={maxValue}
        showReferenceLine1={goalKcal > 0}
        referenceLine1Position={goalKcal}
        referenceLine1Config={{
          color: '#7C7C7C',
          dashWidth: 4,
          dashGap: 4,
          thickness: 1,
        }}
        backgroundColor="transparent"
      />
      {goalKcal > 0 ? (
        <View className="mt-2 flex-row items-center gap-2">
          <View
            style={{
              width: 12,
              height: 1,
              borderTopWidth: 1,
              borderTopColor: '#7C7C7C',
              borderStyle: 'dashed',
            }}
          />
          <Text className="text-fg-dim text-[10px]">
            Goal {Math.round(goalKcal)} kcal
          </Text>
        </View>
      ) : null}
    </View>
  );
}
