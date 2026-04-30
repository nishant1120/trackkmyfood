import { Text, View } from 'react-native';

import { Screen } from '@/components/ui';

export default function LogTab() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-2">
        <Text className="text-fg text-3xl font-bold tracking-tight">Log food</Text>
        <Text className="text-fg-muted text-center text-sm">
          Phase 5 will add search, AI text, camera, and barcode entry.
        </Text>
      </View>
    </Screen>
  );
}
