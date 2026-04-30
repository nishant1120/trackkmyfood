import { useRouter } from 'expo-router';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
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

import { Button, Card, Chip } from '@/components/ui';
import { useBulkAddFoodLogs, type FoodLogInput } from '@/hooks/useFoodLogs';
import type { ParsedFoodItem } from '@/lib/prompts';
import type { MealType } from '@/lib/types';
import { useAiParseStore } from '@/stores/aiParseStore';

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const CONFIDENCE_COLOR: Record<ParsedFoodItem['confidence'], string> = {
  high: '#1DB954',
  medium: '#F59E0B',
  low: '#EF4444',
};

function defaultMeal(): MealType {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

type EditableItem = ParsedFoodItem & { _id: string };

export default function AiConfirmScreen() {
  const router = useRouter();
  const take = useAiParseStore((s) => s.take);
  const bulkAdd = useBulkAddFoodLogs();

  const [items, setItems] = useState<EditableItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [sourceText, setSourceText] = useState<string>('');
  const [meal, setMeal] = useState<MealType>(defaultMeal());

  // Pop the pending parse on mount. If there's nothing pending (e.g. user
  // landed here via deep link), bounce back.
  useEffect(() => {
    const pending = take();
    if (!pending || pending.items.length === 0) {
      router.replace('/(tabs)/log');
      return;
    }
    setItems(
      pending.items.map((it, i) => ({ ...it, _id: `${Date.now()}-${i}` }))
    );
    setNotes(pending.notes ?? '');
    setSourceText(pending.sourceText ?? '');
  }, [router, take]);

  const totals = useMemo(() => {
    return items.reduce(
      (s, it) => ({
        calories: s.calories + (Number(it.calories_kcal) || 0),
        protein: s.protein + (Number(it.protein_g) || 0),
        carbs: s.carbs + (Number(it.carbs_g) || 0),
        fats: s.fats + (Number(it.fats_g) || 0),
        fibre: s.fibre + (Number(it.fibre_g) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, fibre: 0 }
    );
  }, [items]);

  const updateItem = (id: string, patch: Partial<ParsedFoodItem>) => {
    setItems((prev) =>
      prev.map((it) => (it._id === id ? { ...it, ...patch } : it))
    );
  };

  // When user changes ONLY quantity (and macros haven't been hand-edited
  // yet for this row), proportionally rescale macros from the original
  // estimate. Tracked via `_origQty` once we lock in the LLM's first answer.
  const onQuantityChange = (id: string, newQty: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it._id !== id) return it;
        const oldQty = it.quantity || 1;
        if (oldQty === 0 || newQty === oldQty) return { ...it, quantity: newQty };
        const factor = newQty / oldQty;
        return {
          ...it,
          quantity: newQty,
          calories_kcal: round(it.calories_kcal * factor, 1),
          protein_g: round(it.protein_g * factor, 2),
          carbs_g: round(it.carbs_g * factor, 2),
          fats_g: round(it.fats_g * factor, 2),
          fibre_g: round(it.fibre_g * factor, 2),
        };
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it._id !== id));
  };

  const onSave = async () => {
    if (items.length === 0) {
      Alert.alert('Nothing to save', 'Add at least one item.');
      return;
    }
    const inputs: FoodLogInput[] = items.map((it) => ({
      food_id: null,
      ai_food_data: {
        name: it.name,
        name_hindi: it.name_hindi,
        confidence: it.confidence,
        source_text: sourceText,
      },
      meal_type: meal,
      quantity: Number(it.quantity) || 0,
      unit: it.unit,
      calories_kcal: Number(it.calories_kcal) || 0,
      protein_g: Number(it.protein_g) || 0,
      carbs_g: Number(it.carbs_g) || 0,
      fats_g: Number(it.fats_g) || 0,
      fibre_g: Number(it.fibre_g) || 0,
      logged_via: 'ai_text',
      notes: it.name,
    }));

    try {
      await bulkAdd.mutateAsync(inputs);
      router.dismissAll();
      router.replace('/(tabs)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save.';
      Alert.alert('Save failed', msg);
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
          <Text className="text-fg text-base font-semibold">Review & save</Text>
        </View>

        <ScrollView
          contentContainerClassName="px-6 pt-2 pb-6 gap-5"
          keyboardShouldPersistTaps="handled"
        >
          {sourceText ? (
            <Text className="text-fg-dim text-xs">
              You typed:{' '}
              <Text className="text-fg-muted italic">"{sourceText}"</Text>
            </Text>
          ) : null}

          {notes ? (
            <View className="bg-bg-elevated rounded-card border border-warning/30 p-3">
              <Text className="text-warning text-xs uppercase tracking-button">
                AI note
              </Text>
              <Text className="text-fg-muted mt-1 text-xs leading-relaxed">
                {notes}
              </Text>
            </View>
          ) : null}

          {/* Meal type */}
          <View>
            <Text className="text-fg-muted mb-2 text-sm font-medium">Meal</Text>
            <View className="flex-row flex-wrap gap-2">
              {MEAL_OPTIONS.map((m) => (
                <Chip
                  key={m.value}
                  label={m.label}
                  selected={m.value === meal}
                  onPress={() => setMeal(m.value)}
                />
              ))}
            </View>
          </View>

          {/* Items */}
          <View className="gap-3">
            {items.map((it) => (
              <ItemEditor
                key={it._id}
                item={it}
                onChange={(patch) => updateItem(it._id, patch)}
                onChangeQuantity={(q) => onQuantityChange(it._id, q)}
                onRemove={() => removeItem(it._id)}
              />
            ))}
          </View>

          {/* Totals */}
          {items.length > 0 ? (
            <Card>
              <Text className="text-fg-dim text-xs uppercase tracking-button">
                Total for this entry
              </Text>
              <View className="mt-3 flex-row items-baseline gap-2">
                <Text className="text-fg text-3xl font-bold">
                  {Math.round(totals.calories)}
                </Text>
                <Text className="text-fg-muted text-sm">kcal</Text>
              </View>
              <View className="mt-3 flex-row flex-wrap gap-x-6 gap-y-2">
                <Stat label="Protein" value={`${round(totals.protein, 1)} g`} />
                <Stat label="Carbs" value={`${round(totals.carbs, 1)} g`} />
                <Stat label="Fats" value={`${round(totals.fats, 1)} g`} />
                <Stat label="Fibre" value={`${round(totals.fibre, 1)} g`} />
              </View>
            </Card>
          ) : null}
        </ScrollView>

        <View className="border-border-dim border-t px-6 py-4">
          <Button
            onPress={onSave}
            loading={bulkAdd.isPending}
            disabled={items.length === 0}
          >
            Save {items.length > 0 ? `${items.length} item${items.length > 1 ? 's' : ''}` : ''}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ItemEditor({
  item,
  onChange,
  onChangeQuantity,
  onRemove,
}: {
  item: EditableItem;
  onChange: (patch: Partial<ParsedFoodItem>) => void;
  onChangeQuantity: (q: number) => void;
  onRemove: () => void;
}) {
  const [qtyText, setQtyText] = useState(String(item.quantity));
  // Keep local input text in sync if quantity is rescaled externally (it isn't,
  // but we re-init when item identity changes).
  useEffect(() => {
    setQtyText(String(item.quantity));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item._id]);

  return (
    <Card>
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-fg text-base font-semibold capitalize" numberOfLines={1}>
              {item.name}
            </Text>
            <View
              className="rounded-pill px-2 py-0.5"
              style={{ backgroundColor: `${CONFIDENCE_COLOR[item.confidence]}22` }}
            >
              <Text
                className="text-[10px] font-semibold uppercase"
                style={{ color: CONFIDENCE_COLOR[item.confidence] }}
              >
                {item.confidence}
              </Text>
            </View>
          </View>
          {item.name_hindi ? (
            <Text className="text-fg-dim mt-0.5 text-xs">{item.name_hindi}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={onRemove}
          hitSlop={12}
          className="h-9 w-9 items-center justify-center rounded-pill active:bg-bg-elevated"
        >
          <Trash2 size={18} color="#7C7C7C" />
        </Pressable>
      </View>

      {/* Qty + unit */}
      <View className="mt-4 flex-row items-end gap-3">
        <View className="flex-1">
          <Text className="text-fg-dim mb-1 text-xs">Quantity</Text>
          <TextInput
            value={qtyText}
            onChangeText={(t) => {
              setQtyText(t);
              const n = parseFloat(t);
              if (Number.isFinite(n) && n > 0) onChangeQuantity(n);
            }}
            keyboardType="numeric"
            className="bg-bg-elevated text-fg rounded-card px-3 py-3 text-sm"
          />
        </View>
        <View className="w-32">
          <Text className="text-fg-dim mb-1 text-xs">Unit</Text>
          <View className="bg-bg-elevated rounded-pill p-1">
            <View className="flex-row">
              {(['g', 'piece', 'ml'] as const).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => onChange({ unit: u })}
                  className={`flex-1 items-center justify-center rounded-pill py-1.5 ${item.unit === u ? 'bg-brand' : ''}`}
                >
                  <Text
                    className={`text-xs font-semibold ${item.unit === u ? 'text-black' : 'text-fg-muted'}`}
                  >
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Macro grid (editable) */}
      <View className="mt-4 flex-row flex-wrap gap-x-4 gap-y-3">
        <MacroField
          label="kcal"
          value={item.calories_kcal}
          onChange={(v) => onChange({ calories_kcal: v })}
        />
        <MacroField
          label="P (g)"
          value={item.protein_g}
          onChange={(v) => onChange({ protein_g: v })}
        />
        <MacroField
          label="C (g)"
          value={item.carbs_g}
          onChange={(v) => onChange({ carbs_g: v })}
        />
        <MacroField
          label="F (g)"
          value={item.fats_g}
          onChange={(v) => onChange({ fats_g: v })}
        />
        <MacroField
          label="Fib (g)"
          value={item.fibre_g}
          onChange={(v) => onChange({ fibre_g: v })}
        />
      </View>
    </Card>
  );
}

function MacroField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(round(value, 1)));
  useEffect(() => {
    setText(String(round(value, 1)));
  }, [value]);
  return (
    <View className="w-[28%]">
      <Text className="text-fg-dim mb-1 text-[10px] uppercase tracking-button">
        {label}
      </Text>
      <TextInput
        value={text}
        keyboardType="numeric"
        onChangeText={(t) => {
          setText(t);
          const n = parseFloat(t);
          if (Number.isFinite(n) && n >= 0) onChange(n);
        }}
        className="bg-bg-elevated text-fg rounded-card px-2 py-2 text-sm"
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-fg-dim text-xs">{label}</Text>
      <Text className="text-fg mt-0.5 text-sm font-semibold">{value}</Text>
    </View>
  );
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
