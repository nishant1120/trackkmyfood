import { Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileSetup() {
  const signOut = useAuthStore((s) => s.signOut);
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-4">
        <Text className="text-fg text-2xl font-bold">Profile setup</Text>
        <Text className="text-fg-muted text-center text-sm">
          Phase 2 will live here. For now you're signed in.
        </Text>
        <View className="mt-6 w-full">
          <Button variant="secondary" onPress={signOut}>
            Sign out
          </Button>
        </View>
      </View>
    </Screen>
  );
}
