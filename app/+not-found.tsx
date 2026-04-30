import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="text-fg text-2xl font-bold">This screen doesn't exist.</Text>
        <Link href="/" className="text-brand mt-4 text-base">
          Go to home
        </Link>
      </View>
    </>
  );
}
