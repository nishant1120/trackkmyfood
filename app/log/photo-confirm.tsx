import { useRouter } from 'expo-router';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { parseFoodPhoto } from '@/lib/llm';
import { useAiParseStore } from '@/stores/aiParseStore';

type Status =
  | { kind: 'parsing' }
  | { kind: 'error'; message: string }
  | { kind: 'empty'; notes: string };

export default function PhotoConfirmScreen() {
  const router = useRouter();
  const takePhoto = useAiParseStore((s) => s.takePhoto);
  const setParsed = useAiParseStore((s) => s.set);
  const ranRef = useRef(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'parsing' });

  useEffect(() => {
    // Guard against double-fire from React strict-mode / hot reload.
    if (ranRef.current) return;
    ranRef.current = true;

    const photo = takePhoto();
    if (!photo) {
      // No photo in the store — user reloaded the page. Bounce back.
      router.replace('/(tabs)/log');
      return;
    }
    setImageUri(photo.uri);

    let cancelled = false;
    async function run() {
      const result = await parseFoodPhoto(photo!.base64);
      if (cancelled) return;
      if (!result.ok) {
        setStatus({
          kind: 'error',
          message: friendlyMessage(result.error.kind, result.error.message),
        });
        return;
      }
      if (result.data.items.length === 0) {
        setStatus({
          kind: 'empty',
          notes:
            result.data.notes ||
            'Photo unclear. Try better lighting or a closer shot.',
        });
        return;
      }
      // Hand off to ai-confirm for editing + save.
      setParsed(result.data.items, result.data.notes, {
        sourceText: '(photo)',
        loggedVia: 'camera',
      });
      router.replace('/log/ai-confirm');
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [router, setParsed, takePhoto]);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-pill active:bg-bg-elevated"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <Sparkles size={18} color="#F59E0B" />
          <Text className="text-fg text-base font-semibold">Reading your plate</Text>
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            resizeMode="cover"
            style={{
              width: 240,
              height: 240,
              borderRadius: 16,
              marginBottom: 24,
            }}
          />
        ) : null}

        {status.kind === 'parsing' ? (
          <>
            <ActivityIndicator size="large" color="#1DB954" />
            <Text className="text-fg mt-4 text-base font-semibold">
              Identifying foods…
            </Text>
            <Text className="text-fg-muted mt-2 text-center text-xs">
              Sending the photo to AI for an estimate.
            </Text>
          </>
        ) : status.kind === 'empty' ? (
          <>
            <Text className="text-fg text-lg font-semibold">No food found</Text>
            <Text className="text-fg-muted mt-2 text-center text-sm">
              {status.notes}
            </Text>
            <View className="mt-6 w-full">
              <Button onPress={() => router.back()}>Try another photo</Button>
            </View>
          </>
        ) : (
          <>
            <Text className="text-fg text-lg font-semibold">
              Couldn't read the photo
            </Text>
            <Text className="text-fg-muted mt-2 text-center text-sm">
              {status.message}
            </Text>
            <View className="mt-6 w-full">
              <Button onPress={() => router.back()}>Try again</Button>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function friendlyMessage(kind: string, message: string): string {
  if (kind === 'rate_limit') {
    return 'AI quota reached for now. Try again in a few minutes, or use Search.';
  }
  if (kind === 'no_api_key') {
    return 'AI is not configured. Use Search to log foods for now.';
  }
  if (kind === 'parse') {
    return 'I got a response but it was malformed. Try a clearer photo.';
  }
  if (kind === 'network') {
    return 'Network problem reaching the AI. Check your connection.';
  }
  return message.slice(0, 200);
}
