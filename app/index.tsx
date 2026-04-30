import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Welcome() {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-fg text-4xl font-bold tracking-tight">
          NutriTrack
        </Text>
        <Text className="text-fg-muted mt-3 text-base">
          Phase 0 ready. Spotify-inspired calorie tracking, coming up.
        </Text>
        <View className="bg-brand mt-8 h-2 w-24 rounded-pill" />
      </View>
    </SafeAreaView>
  );
}
