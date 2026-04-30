import { Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <Screen>
      <View className="flex-1 justify-center gap-3">
        <Text className="text-fg text-3xl font-bold tracking-tight">Dashboard</Text>
        <Text className="text-fg-muted text-base">
          Phase 4 will turn this into a Spotify-style daily summary.
        </Text>
        {user ? (
          <Text className="text-fg-dim mt-2 text-xs">Signed in as {user.email}</Text>
        ) : null}
        <View className="mt-8">
          <Button variant="secondary" onPress={signOut}>
            Sign out
          </Button>
        </View>
      </View>
    </Screen>
  );
}
