import { Text, View } from 'react-native';

import { Screen } from '@/components/ui';

export default function HistoryTab() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-2">
        <Text className="text-fg text-3xl font-bold tracking-tight">History</Text>
        <Text className="text-fg-muted text-center text-sm">
          Phase 10 will add streak heatmaps, weekly trends, and weight tracking.
        </Text>
      </View>
    </Screen>
  );
}
