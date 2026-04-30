import { useRouter } from 'expo-router';
import { Bookmark, ChevronLeft, Trash2 } from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui';
import {
  useDeleteTemplate,
  useTemplates,
  type MealTemplate,
} from '@/hooks/useTemplates';
import type { ParsedFoodItem } from '@/lib/prompts';
import { useAiParseStore } from '@/stores/aiParseStore';

export default function TemplatesScreen() {
  const router = useRouter();
  const { data, isLoading } = useTemplates();
  const deleteMut = useDeleteTemplate();
  const setParsed = useAiParseStore((s) => s.set);

  const onApply = (template: MealTemplate) => {
    // Convert template items to ParsedFoodItem-shaped objects so ai-confirm
    // can render them. Confidence is faked as 'high' since the user already
    // saved these values once.
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

  const onDelete = (template: MealTemplate) => {
    Alert.alert('Delete template?', `"${template.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMut.mutate(template.id),
      },
    ]);
  };

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
        <Text className="text-fg text-base font-semibold">Templates</Text>
      </View>

      <ScrollView contentContainerClassName="px-6 pt-2 pb-10 gap-3">
        {isLoading ? (
          <View className="items-center pt-12">
            <ActivityIndicator size="small" color="#1DB954" />
          </View>
        ) : (data?.length ?? 0) === 0 ? (
          <Card>
            <View className="flex-row items-start gap-3">
              <Bookmark size={20} color="#7C7C7C" />
              <View className="flex-1">
                <Text className="text-fg text-sm font-semibold">
                  No templates yet
                </Text>
                <Text className="text-fg-muted mt-1 text-xs">
                  After logging a meal with Type-with-AI or Photograph,
                  toggle "Save as template" to reuse it later.
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          (data ?? []).map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
              onApply={() => onApply(t)}
              onDelete={() => onDelete(t)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TemplateRow({
  template,
  onApply,
  onDelete,
}: {
  template: MealTemplate;
  onApply: () => void;
  onDelete: () => void;
}) {
  const totalKcal = (template.items ?? []).reduce(
    (s, it) => s + (Number(it.calories_kcal) || 0),
    0
  );
  const itemCount = (template.items ?? []).length;
  const preview = (template.items ?? [])
    .slice(0, 3)
    .map((it) => it.name)
    .join(', ');

  return (
    <Pressable onPress={onApply} className="active:opacity-80">
      <Card>
        <View className="flex-row items-start gap-3">
          <View className="bg-bg-chip h-11 w-11 items-center justify-center rounded-full">
            <Bookmark size={18} color="#1DB954" />
          </View>
          <View className="flex-1">
            <Text className="text-fg text-base font-semibold" numberOfLines={1}>
              {template.name}
            </Text>
            <Text className="text-fg-muted mt-0.5 text-xs" numberOfLines={1}>
              {itemCount} item{itemCount === 1 ? '' : 's'} ·{' '}
              {Math.round(totalKcal)} kcal
              {template.meal_type ? ` · ${template.meal_type}` : ''}
            </Text>
            {preview ? (
              <Text className="text-fg-dim mt-1 text-xs" numberOfLines={1}>
                {preview}
                {itemCount > 3 ? ', …' : ''}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={onDelete}
            hitSlop={10}
            className="h-9 w-9 items-center justify-center rounded-pill active:bg-bg-elevated"
          >
            <Trash2 size={16} color="#7C7C7C" />
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}
