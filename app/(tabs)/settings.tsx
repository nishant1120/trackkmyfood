import { Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';

export default function SettingsTab() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <Screen>
      <View className="flex-1 gap-4 pt-6">
        <Text className="text-fg text-3xl font-bold tracking-tight">Settings</Text>
        <Text className="text-fg-muted text-sm">
          Phase 11 will add profile editing, theme toggle, and reminder controls.
        </Text>
        {user ? (
          <Text className="text-fg-dim mt-3 text-xs">Signed in as {user.email}</Text>
        ) : null}
        <View className="mt-auto">
          <Button variant="secondary" onPress={signOut}>
            Sign out
          </Button>
        </View>
      </View>
    </Screen>
  );
}
