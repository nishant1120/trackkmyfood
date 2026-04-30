import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui';

export default function AboutScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-pill active:bg-bg-elevated"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-fg text-base font-semibold">About</Text>
      </View>

      <ScrollView contentContainerClassName="px-6 pt-2 pb-10 gap-4">
        <View className="items-center pb-2">
          <Text className="text-fg text-4xl font-bold tracking-tight">
            NutriTrack
          </Text>
          <Text className="text-fg-dim mt-1 text-xs">v0.1.0 · Phase 11</Text>
        </View>

        <Card>
          <Text className="text-fg text-sm font-semibold">What it does</Text>
          <Text className="text-fg-muted mt-2 text-xs leading-relaxed">
            NutriTrack helps you log Indian and global foods with four entry
            methods — search a 2,000+ food database, type in plain language,
            photograph a plate, or scan a barcode. AI estimates kick in when
            data is missing.
          </Text>
        </Card>

        <Card>
          <Text className="text-fg text-sm font-semibold">Data sources</Text>
          <Bullet>IFCT 2017 (Indian Food Composition Tables)</Bullet>
          <Bullet>USDA FoodData Central — Foundation + SR Legacy</Bullet>
          <Bullet>Open Food Facts (India-tagged products)</Bullet>
          <Bullet>Google Gemini for AI parsing and insights</Bullet>
        </Card>

        <Card>
          <Text className="text-fg text-sm font-semibold">Privacy</Text>
          <Text className="text-fg-muted mt-2 text-xs leading-relaxed">
            Your food logs, weights, and profile are stored on Supabase under
            row-level security: only you can read or write your own rows. AI
            parses are sent to Google with no user identifiers attached. Photos
            are never persisted by default.
          </Text>
        </Card>

        <Pressable
          onPress={() =>
            Linking.openURL('https://github.com/anthropics/claude-code/issues')
          }
        >
          <Card>
            <Text className="text-fg text-sm font-semibold">Send feedback</Text>
            <Text className="text-fg-muted mt-1 text-xs">
              Found a bug or want a feature? Tap to open the issue tracker.
            </Text>
          </Card>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View className="mt-2 flex-row gap-2">
      <Text className="text-fg-dim">·</Text>
      <Text className="text-fg-muted text-xs leading-relaxed flex-1">
        {children}
      </Text>
    </View>
  );
}
