import { useRouter } from 'expo-router';
import {
  Barcode,
  Bookmark,
  Camera,
  ChevronRight,
  Search,
  Sparkles,
} from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card, Screen } from '@/components/ui';
import { useTemplates, type MealTemplate } from '@/hooks/useTemplates';
import type { ParsedFoodItem } from '@/lib/prompts';
import { useAiParseStore } from '@/stores/aiParseStore';

type Method = {
  key: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  href: '/log/search' | '/log/ai-text' | '/log/camera' | '/log/barcode' | '/log/templates';
};

const METHODS: Method[] = [
  {
    key: 'search',
    title: 'Search foods',
    body: '2,000+ Indian and global foods, full nutrition.',
    icon: <Search size={22} color="#1DB954" />,
    href: '/log/search',
  },
  {
    key: 'ai-text',
    title: 'Type with AI',
    body: '"2 rotis, 1 katori dal" — we parse the rest.',
    icon: <Sparkles size={22} color="#F59E0B" />,
    href: '/log/ai-text',
  },
  {
    key: 'camera',
    title: 'Photograph plate',
    body: 'Snap your meal and get an estimate.',
    icon: <Camera size={22} color="#8B5CF6" />,
    href: '/log/camera',
  },
  {
    key: 'barcode',
    title: 'Scan barcode',
    body: 'For packaged items with a label.',
    icon: <Barcode size={22} color="#539DF5" />,
    href: '/log/barcode',
  },
  {
    key: 'templates',
    title: 'Templates',
    body: 'Reuse your saved meal combos.',
    icon: <Bookmark size={22} color="#1DB954" />,
    href: '/log/templates',
  },
];

export default function LogTab() {
  const router = useRouter();
  const { data: templates } = useTemplates();
  const setParsed = useAiParseStore((s) => s.set);

  const recent = (templates ?? []).slice(0, 4);

  const applyTemplate = (template: MealTemplate) => {
    const items: ParsedFoodItem[] = (template.items ?? []).map((it) => ({
      name: it.name,
      name_hindi: it.name_hindi ?? null,
      quantity: it.quantity,
      unit: it.unit,
      calories_kcal: it.calories_kcal,
      protein_g: it.protein_g,
      carbs_g: it.carbs_g,
      fats_g: it.fats_g,
      fibre_g: it.fibre_g,
      confidence: 'high',
    }));
    setParsed(items, '', { sourceText: template.name, loggedVia: 'template' });
    router.push('/log/ai-confirm');
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerClassName="px-6 pt-6 pb-10 gap-4">
        <View>
          <Text className="text-fg text-3xl font-bold tracking-tight">
            Log food
          </Text>
          <Text className="text-fg-muted mt-2 text-sm">
            Pick a method. We'll preview the nutrition before you save.
          </Text>
        </View>

        {/* Recent templates strip */}
        {recent.length > 0 ? (
          <View>
            <View className="mb-3 flex-row items-baseline justify-between">
              <Text className="text-fg-dim text-xs uppercase tracking-button">
                Quick log
              </Text>
              {(templates?.length ?? 0) > recent.length ? (
                <Pressable
                  onPress={() => router.push('/log/templates')}
                  hitSlop={8}
                >
                  <Text className="text-brand text-xs font-semibold">
                    See all
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2"
            >
              {recent.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => applyTemplate(t)}
                  className="bg-bg-elevated min-w-[140px] active:opacity-80"
                  style={{ borderRadius: 16 }}
                >
                  <View className="p-3">
                    <Bookmark size={16} color="#1DB954" />
                    <Text
                      className="text-fg mt-2 text-sm font-semibold"
                      numberOfLines={1}
                    >
                      {t.name}
                    </Text>
                    <Text className="text-fg-dim mt-1 text-[11px]">
                      {(t.items ?? []).length} item
                      {(t.items ?? []).length === 1 ? '' : 's'}
                      {' · '}
                      {Math.round(
                        (t.items ?? []).reduce(
                          (s, it) => s + (Number(it.calories_kcal) || 0),
                          0
                        )
                      )}{' '}
                      kcal
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View className="gap-2">
          {METHODS.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => router.push(m.href)}
              className="active:opacity-80"
            >
              <Card>
                <View className="flex-row items-center gap-4">
                  <View className="bg-bg-chip h-11 w-11 items-center justify-center rounded-full">
                    {m.icon}
                  </View>
                  <View className="flex-1">
                    <Text className="text-fg text-base font-semibold">
                      {m.title}
                    </Text>
                    <Text className="text-fg-muted mt-1 text-xs">{m.body}</Text>
                  </View>
                  <ChevronRight size={18} color="#7C7C7C" />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
