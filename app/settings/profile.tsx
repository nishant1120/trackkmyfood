import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Button, Card, Chip, Input, Segmented } from '@/components/ui';
import { useProfile, useUpsertProfile } from '@/hooks/useProfile';
import { calculateGoals } from '@/lib/nutrition';
import type { ActivityLevel } from '@/lib/types';

const requiredNumber = (msg = 'Required') =>
  z.number({ error: (issue) => (issue.input === undefined ? msg : 'Enter a number') });

const schema = z.object({
  full_name: z.string().min(1, 'Required').max(80, 'Too long'),
  age: requiredNumber().int('Whole numbers only').min(13).max(120),
  height_cm: requiredNumber().min(80).max(250),
  weight_kg: requiredNumber().min(25).max(400),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  medical_conditions: z.array(z.string()),
  dietary_preferences: z.array(z.string()),
});
type FormValues = z.infer<typeof schema>;

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary', hint: 'Little to no exercise' },
  { value: 'light', label: 'Lightly active', hint: 'Light exercise 1–3 days/week' },
  { value: 'moderate', label: 'Moderately active', hint: 'Moderate exercise 3–5 days/week' },
  { value: 'active', label: 'Very active', hint: 'Hard exercise 6–7 days/week' },
  { value: 'very_active', label: 'Athlete', hint: 'Hard daily exercise + physical job' },
] satisfies ReadonlyArray<{ value: ActivityLevel; label: string; hint: string }>;

const MEDICAL_OPTIONS = [
  'diabetes_type_2',
  'diabetes_type_1',
  'hypertension',
  'high_cholesterol',
  'pcos',
  'thyroid',
  'celiac',
  'lactose_intolerant',
];

const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'eggetarian',
  'jain',
  'gluten_free',
  'lactose_free',
  'low_carb',
  'high_protein',
];

const PRETTY: Record<string, string> = {
  diabetes_type_2: 'Type 2 diabetes',
  diabetes_type_1: 'Type 1 diabetes',
  hypertension: 'Hypertension',
  high_cholesterol: 'High cholesterol',
  pcos: 'PCOS',
  thyroid: 'Thyroid',
  celiac: 'Celiac',
  lactose_intolerant: 'Lactose intolerant',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  eggetarian: 'Eggetarian',
  jain: 'Jain',
  gluten_free: 'Gluten-free',
  lactose_free: 'Lactose-free',
  low_carb: 'Low-carb',
  high_protein: 'High-protein',
};

export default function ProfileEditScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const upsert = useUpsertProfile();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      age: undefined as unknown as number,
      height_cm: undefined as unknown as number,
      weight_kg: undefined as unknown as number,
      activity_level: 'moderate',
      medical_conditions: [],
      dietary_preferences: [],
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name,
        age: profile.age,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        activity_level: profile.activity_level,
        medical_conditions: profile.medical_conditions ?? [],
        dietary_preferences: profile.dietary_preferences ?? [],
      });
    }
  }, [profile, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!profile) return;
    // Recalculate goals from the new body composition + activity. This
    // overwrites the daily goal numbers but the user keeps their water goal.
    const goals = calculateGoals({
      weightKg: values.weight_kg,
      heightCm: values.height_cm,
      age: values.age,
      gender: profile.gender,
      activityLevel: values.activity_level,
    });
    try {
      await upsert.mutateAsync({
        email: profile.email,
        full_name: values.full_name,
        age: values.age,
        gender: profile.gender,
        height_cm: values.height_cm,
        weight_kg: values.weight_kg,
        activity_level: values.activity_level,
        medical_conditions: values.medical_conditions,
        dietary_preferences: values.dietary_preferences,
        daily_calorie_goal: goals.calories,
        daily_protein_goal_g: goals.proteinG,
        daily_carbs_goal_g: goals.carbsG,
        daily_fats_goal_g: goals.fatsG,
        daily_fibre_goal_g: goals.fibreG,
        daily_water_goal_ml: profile.daily_water_goal_ml ?? 2500,
        theme: profile.theme,
        notifications_enabled: profile.notifications_enabled,
      });
      router.back();
    } catch (err) {
      Alert.alert(
        'Save failed',
        err instanceof Error ? err.message : 'Unknown error'
      );
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
          <Text className="text-fg text-base font-semibold">Edit profile</Text>
        </View>

        <ScrollView
          contentContainerClassName="px-6 pt-2 pb-6 gap-5"
          keyboardShouldPersistTaps="handled"
        >
          {isLoading || !profile ? null : (
            <>
              <Controller
                control={control}
                name="full_name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Name"
                    value={value ?? ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.full_name?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="age"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Age"
                    keyboardType="numeric"
                    value={value !== undefined && !Number.isNaN(value) ? String(value) : ''}
                    onChangeText={(t) => onChange(t === '' ? undefined : Number(t))}
                    onBlur={onBlur}
                    error={errors.age?.message}
                  />
                )}
              />

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Controller
                    control={control}
                    name="height_cm"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Height (cm)"
                        keyboardType="numeric"
                        value={value !== undefined && !Number.isNaN(value) ? String(value) : ''}
                        onChangeText={(t) => onChange(t === '' ? undefined : Number(t))}
                        onBlur={onBlur}
                        error={errors.height_cm?.message}
                      />
                    )}
                  />
                </View>
                <View className="flex-1">
                  <Controller
                    control={control}
                    name="weight_kg"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label="Weight (kg)"
                        keyboardType="numeric"
                        value={value !== undefined && !Number.isNaN(value) ? String(value) : ''}
                        onChangeText={(t) => onChange(t === '' ? undefined : Number(t))}
                        onBlur={onBlur}
                        error={errors.weight_kg?.message}
                      />
                    )}
                  />
                </View>
              </View>

              <View>
                <Text className="text-fg-muted mb-2 text-sm font-medium">
                  Activity level
                </Text>
                <Controller
                  control={control}
                  name="activity_level"
                  render={({ field: { onChange, value } }) => (
                    <Segmented
                      layout="column"
                      options={ACTIVITY_OPTIONS}
                      value={value}
                      onChange={onChange}
                    />
                  )}
                />
              </View>

              <View>
                <Text className="text-fg-muted mb-3 text-sm font-medium">
                  Medical conditions
                </Text>
                <Controller
                  control={control}
                  name="medical_conditions"
                  render={({ field: { onChange, value } }) => (
                    <ChipGrid
                      options={MEDICAL_OPTIONS}
                      selected={value ?? []}
                      onToggle={(v) =>
                        onChange(
                          (value ?? []).includes(v)
                            ? (value ?? []).filter((x) => x !== v)
                            : [...(value ?? []), v]
                        )
                      }
                    />
                  )}
                />
              </View>

              <View>
                <Text className="text-fg-muted mb-3 text-sm font-medium">
                  Dietary preferences
                </Text>
                <Controller
                  control={control}
                  name="dietary_preferences"
                  render={({ field: { onChange, value } }) => (
                    <ChipGrid
                      options={DIETARY_OPTIONS}
                      selected={value ?? []}
                      onToggle={(v) =>
                        onChange(
                          (value ?? []).includes(v)
                            ? (value ?? []).filter((x) => x !== v)
                            : [...(value ?? []), v]
                        )
                      }
                    />
                  )}
                />
              </View>

              <Card>
                <Text className="text-fg-dim text-xs uppercase tracking-button">
                  Note
                </Text>
                <Text className="text-fg-muted mt-1 text-xs leading-relaxed">
                  Saving will recalculate your daily calorie and macro goals
                  using your latest weight, height, age, and activity. Water
                  goal is preserved.
                </Text>
              </Card>
            </>
          )}
        </ScrollView>

        <View className="border-border-dim border-t px-6 py-4">
          <Button
            onPress={handleSubmit(onSubmit)}
            loading={upsert.isPending}
            disabled={!isDirty || isLoading}
          >
            Save changes
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => (
        <Chip
          key={opt}
          label={PRETTY[opt] ?? opt}
          selected={selected.includes(opt)}
          onPress={() => onToggle(opt)}
        />
      ))}
    </View>
  );
}
