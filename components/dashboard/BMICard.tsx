import { Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { bmiCategory, type BMICategory } from '@/lib/nutrition';

type BMICardProps = {
  bmi: number;
};

const CATEGORY_COLOR: Record<BMICategory, string> = {
  underweight: '#539DF5',
  normal: '#1DB954',
  overweight: '#F59E0B',
  obese: '#EF4444',
};

const CATEGORY_LABEL: Record<BMICategory, string> = {
  underweight: 'Underweight',
  normal: 'Normal range',
  overweight: 'Overweight',
  obese: 'Obese',
};

export function BMICard({ bmi }: BMICardProps) {
  const cat = bmiCategory(bmi);
  const color = CATEGORY_COLOR[cat];
  return (
    <Card>
      <Text className="text-fg-dim text-xs uppercase tracking-button">BMI</Text>
      <View className="mt-2 flex-row items-baseline gap-3">
        <Text className="text-fg text-3xl font-bold">{bmi.toFixed(1)}</Text>
        <View
          className="rounded-pill px-3 py-1"
          style={{ backgroundColor: `${color}22` }}
        >
          <Text className="text-xs font-semibold" style={{ color }}>
            {CATEGORY_LABEL[cat]}
          </Text>
        </View>
      </View>
      <Text className="text-fg-muted mt-2 text-xs leading-relaxed">
        Body Mass Index is a rough screening tool. It doesn't account for muscle
        mass, body composition, or distribution.
      </Text>
    </Card>
  );
}
