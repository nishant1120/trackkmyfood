import { LineChart } from 'react-native-gifted-charts';
import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';

import type { DayBucket } from '@/hooks/useTrends';

type Macro = 'protein_g' | 'carbs_g' | 'fats_g' | 'fibre_g';

const MACRO_OPTIONS: {
  key: Macro;
  label: string;
  color: string;
}[] = [
  { key: 'protein_g', label: 'Protein', color: '#1DB954' },
  { key: 'carbs_g', label: 'Carbs', color: '#F59E0B' },
  { key: 'fats_g', label: 'Fats', color: '#EF4444' },
  { key: 'fibre_g', label: 'Fibre', color: '#8B5CF6' },
];

type MacroTrendChartProps = {
  days: DayBucket[];
  width?: number;
};

export function MacroTrendChart({ days, width }: MacroTrendChartProps) {
  const [selected, setSelected] = useState<Macro>('protein_g');
  const opt = MACRO_OPTIONS.find((m) => m.key === selected)!;

  // Use the last 30 days
  const window = days.slice(-30);
  const data = window.map((d) => ({
    value: Math.round(Number(d[selected]) * 10) / 10,
  }));

  const max = Math.max(...data.map((d) => d.value), 10);
  const maxValue = Math.ceil((max * 1.2) / 10) * 10 || 50;

  return (
    <View>
      <View className="mb-3 flex-row gap-2">
        {MACRO_OPTIONS.map((m) => {
          const active = m.key === selected;
          return (
            <Pressable
              key={m.key}
              onPress={() => setSelected(m.key)}
              className={`rounded-pill px-3 py-1.5 ${active ? '' : 'bg-bg-elevated'}`}
              style={active ? { backgroundColor: m.color } : undefined}
            >
              <Text
                className={`text-xs font-semibold ${active ? 'text-black' : 'text-fg-muted'}`}
              >
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <LineChart
        data={data}
        height={140}
        width={width ?? 280}
        thickness={2}
        color={opt.color}
        startFillColor={opt.color}
        endFillColor="#000000"
        startOpacity={0.3}
        endOpacity={0}
        areaChart
        hideDataPoints
        hideRules
        hideYAxisText
        xAxisColor="#1F1F1F"
        yAxisColor="transparent"
        noOfSections={3}
        maxValue={maxValue}
        initialSpacing={4}
        endSpacing={4}
        spacing={(width ? width - 8 : 280 - 8) / Math.max(1, data.length - 1)}
        backgroundColor="transparent"
      />
      <Text className="text-fg-dim mt-2 text-[10px]">
        Last 30 days · {opt.label.toLowerCase()} g per day
      </Text>
    </View>
  );
}
