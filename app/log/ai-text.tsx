import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card } from '@/components/ui';
import { parseFoodText } from '@/lib/llm';
import { useAiParseStore } from '@/stores/aiParseStore';

const EXAMPLES = [
  '2 rotis, 1 katori dal tadka, salad',
  '1 plate poha, 1 cup chai with sugar',
  '1 boiled egg, 100g paneer, 1 banana',
];

export default function AiTextScreen() {
  const router = useRouter();
  const { initialQuery } = useLocalSearchParams<{ initialQuery?: string }>();
  const setParsed = useAiParseStore((s) => s.set);
  const [text, setText] = useState(initialQuery ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Prefill once when the screen opens with a search-fallback query.
    if (initialQuery) setText(initialQuery);
  }, [initialQuery]);

  const onSubmit = async () => {
    const input = text.trim();
    if (input.length < 2) {
      Alert.alert('Add some detail', 'Tell us what you ate, e.g. "2 rotis, 1 katori dal".');
      return;
    }
    setSubmitting(true);
    try {
      const result = await parseFoodText(input);
      if (!result.ok) {
        Alert.alert(
          'AI parse failed',
          friendlyMessage(result.error.kind, result.error.message)
        );
        return;
      }
      if (result.data.items.length === 0) {
        Alert.alert(
          'No food found',
          result.data.notes ||
            "I couldn't recognize any food in that. Try '2 rotis, 1 katori dal' or similar."
        );
        return;
      }
      setParsed(result.data.items, result.data.notes, input);
      router.push('/log/ai-confirm');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
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
            <Text className="text-fg text-base font-semibold">Type with AI</Text>
          </View>
        </View>

        <ScrollView
          contentContainerClassName="px-6 pt-2 pb-6 gap-5"
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <Text className="text-fg text-3xl font-bold tracking-tight">
              What did you eat?
            </Text>
            <Text className="text-fg-muted mt-2 text-sm">
              Type it in plain language. Indian portion words like "katori",
              "plate", "glass" are fine.
            </Text>
          </View>

          <View className="bg-bg-elevated rounded-card p-4">
            <TextInput
              autoFocus
              multiline
              value={text}
              onChangeText={setText}
              placeholder="e.g. 2 rotis, 1 katori dal, salad"
              placeholderTextColor="#7C7C7C"
              className="text-fg min-h-[120px] text-base leading-relaxed"
              textAlignVertical="top"
            />
          </View>

          <View>
            <Text className="text-fg-dim mb-2 text-xs uppercase tracking-button">
              Try
            </Text>
            <View className="gap-2">
              {EXAMPLES.map((ex) => (
                <Pressable
                  key={ex}
                  onPress={() => setText(ex)}
                  className="active:opacity-80"
                >
                  <Card>
                    <Text className="text-fg-muted text-sm" numberOfLines={2}>
                      {ex}
                    </Text>
                  </Card>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        <View className="border-border-dim border-t px-6 py-4">
          <Button onPress={onSubmit} loading={submitting}>
            {submitting ? 'Parsing…' : 'Parse with AI'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function friendlyMessage(kind: string, message: string): string {
  if (kind === 'rate_limit') {
    return "AI quota reached for now. Try again in a few minutes, or use Search.";
  }
  if (kind === 'no_api_key') {
    return 'AI is not configured. Use Search to log foods for now.';
  }
  if (kind === 'parse') {
    return "I got an answer but couldn't parse it. Try rephrasing your input.";
  }
  if (kind === 'network') {
    return 'Network problem reaching the AI. Check your connection.';
  }
  return message.slice(0, 200);
}
