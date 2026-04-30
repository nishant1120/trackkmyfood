import { View } from 'react-native';

type StepperProps = {
  current: number;
  total: number;
};

export function Stepper({ current, total }: StepperProps) {
  return (
    <View className="flex-row gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const active = i <= current;
        return (
          <View
            key={i}
            className={`h-1 flex-1 rounded-pill ${active ? 'bg-brand' : 'bg-bg-elevated'}`}
          />
        );
      })}
    </View>
  );
}
