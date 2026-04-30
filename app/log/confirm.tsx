import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, Input, Segmented } from '@/components/ui';
import { useAddFoodLog } from '@/hooks/useFoodLogs';
import { useFood } from '@/hooks/useFoods';
import type { Food, LoggedVia, MealType, Unit } from '@/lib/types';
import { useAiParseStore } from '@/stores/aiParseStore';

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const UNIT_OPTIONS: { value: Unit; label: string }[] = [
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
];

function defaultMeal(): MealType {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

function scaleFood(food: Food, qty: number) {
  const base = food.serving_size_g > 0 ? food.serving_size_g : 100;
  const factor = qty / base;
  return {
    calories_kcal: round(food.calories_kcal * factor, 1),
    protein_g: round(food.protein_g * factor, 2),
    carbs_g: round(food.carbs_g * factor, 2),
    fats_g: round(food.fats_g * factor, 2),
    fibre_g: round(food.fibre_g * factor, 2),
    vitamin_a_mcg: round(food.vitamin_a_mcg * factor, 2),
    vitamin_c_mg: round(food.vitamin_c_mg * factor, 2),
    vitamin_d_mcg: round(food.vitamin_d_mcg * factor, 3),
    vitamin_b12_mcg: round(food.vitamin_b12_mcg * factor, 3),
    iron_mg: round(food.iron_mg * factor, 3),
    calcium_mg: round(food.calcium_mg * factor, 1),
  };
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export default function ConfirmScreen() {
  const router = useRouter();
  const { foodId } = useLocalSearchParams<{ foodId: string }>();
  const { data: dbFood, isLoading } = useFood(foodId);
  const takeFood = useAiParseStore((s) => s.takeFood);
  const [pendingFood, setPendingFood] = useState<{
    food: Omit<Food, 'id' | 'created_at'>;
    loggedVia: LoggedVia;
  } | null>(null);
  const addLog = useAddFoodLog();

  // If we don't have a foodId, pop the pendingFood from the store (e.g. from
  // the barcode flow). One-shot: if the user reloads, we bounce back.
  useEffect(() => {
    if (foodId) return;
    const popped = takeFood();
    if (!popped) {
      router.replace('/(tabs)/log');
      return;
    }
    setPendingFood(popped);
  }, [foodId, router, takeFood]);

  // Materialize a Food-shaped object for the rest of the component.
  const food: Food | null = useMemo(() => {
    if (dbFood) return dbFood;
    if (pendingFood) {
      return {
        id: '',
        created_at: '',
        ...pendingFood.food,
      } as Food;
    }
    return null;
  }, [dbFood, pendingFood]);

  const loggedVia: LoggedVia = pendingFood?.loggedVia ?? 'search';

  const [quantity, setQuantity] = useState<string>('100');
  const [unit, setUnit] = useState<Unit>('g');
  const [mealType, setMealType] = useState<MealType>(defaultMeal());

  const qtyNum = useMemo(() => {
    const n = parseFloat(quantity);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [quantity]);

  const scaled = useMemo(
    () => (food ? scaleFood(food, qtyNum) : null),
    [food, qtyNum]
  );

  // Loading: either DB query in flight, or no foodId AND store pop hasn't run yet.
  if ((foodId && isLoading) || !food) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      </SafeAreaView>
    );
  }

  const onSave = async () => {
    if (!scaled || qtyNum <= 0) {
      Alert.alert('Invalid quantity', 'Enter a quantity greater than zero.');
      return;
    }
    try {
      await addLog.mutateAsync({
        food_id: food.id || null,
        ai_food_data: {
          name: food.name,
          brand: food.brand,
          source: food.source,
          external_id: food.external_id,
        },
        meal_type: mealType,
        quantity: qtyNum,
        unit,
        ...scaled,
        logged_via: loggedVia,
      });
      // Pop the log stack and land on the Home tab so the user sees the
      // updated totals immediately.
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
          <Text className="text-fg text-base font-semibold">Log food</Text>
        </View>

        <ScrollView
          contentContainerClassName="px-6 pt-2 pb-6 gap-5"
          keyboardShouldPersistTaps="handled"
        >
          {/* Food header */}
          <View>
            <Text
              className="text-fg text-2xl font-bold leading-tight"
              numberOfLines={2}
            >
              {food.name}
            </Text>
            {food.name_hindi ? (
              <Text className="text-fg-muted mt-1 text-sm">{food.name_hindi}</Text>
            ) : null}
            <Text className="text-fg-dim mt-1 text-xs">
              {food.brand ? `${food.brand} · ` : ''}
              {Math.round(food.calories_kcal)} kcal per {food.serving_size_g}g
              {food.cuisine ? ` · ${food.cuisine}` : ''}
            </Text>
          </View>

          {/* Quantity + unit */}
          <View className="gap-3">
            <View className="flex-row items-end gap-3">
              <View className="flex-1">
                <Input
                  label="Quantity"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="100"
                />
              </View>
              <View className="w-32 pb-1">
                <Segmented
                  options={UNIT_OPTIONS}
                  value={unit}
                  onChange={setUnit}
                />
              </View>
            </View>
            <Text className="text-fg-dim text-xs">
              g and ml scale 1:1 with the per-100g nutrition values. For
              cups/pieces, we'll add conversions in a later phase.
            </Text>
          </View>

          {/* Meal type */}
          <View>
            <Text className="text-fg-muted mb-2 text-sm font-medium">
              Meal
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {MEAL_OPTIONS.map((m) => (
                <Chip
                  key={m.value}
                  label={m.label}
                  selected={m.value === mealType}
                  onPress={() => setMealType(m.value)}
                />
              ))}
            </View>
          </View>

          {/* Live nutrition preview */}
          <Card>
            <Text className="text-fg-dim text-xs uppercase tracking-button">
              Nutrition for {qtyNum || '—'} {unit}
            </Text>
            <View className="mt-3 flex-row items-baseline gap-2">
              <Text className="text-fg text-3xl font-bold">
                {scaled ? Math.round(scaled.calories_kcal) : 0}
              </Text>
              <Text className="text-fg-muted text-sm">kcal</Text>
            </View>
            <View className="mt-3 flex-row flex-wrap gap-x-6 gap-y-2">
              <Stat
                label="Protein"
                value={scaled ? `${scaled.protein_g} g` : '—'}
              />
              <Stat
                label="Carbs"
                value={scaled ? `${scaled.carbs_g} g` : '—'}
              />
              <Stat label="Fats" value={scaled ? `${scaled.fats_g} g` : '—'} />
              <Stat
                label="Fibre"
                value={scaled ? `${scaled.fibre_g} g` : '—'}
              />
              <Stat
                label="Iron"
                value={scaled ? `${scaled.iron_mg} mg` : '—'}
              />
              <Stat
                label="Calcium"
                value={scaled ? `${scaled.calcium_mg} mg` : '—'}
              />
            </View>
          </Card>
        </ScrollView>

        <View className="border-border-dim border-t px-6 py-4">
          <Button onPress={onSave} loading={addLog.isPending}>
            Save
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
