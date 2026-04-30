import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { z } from 'zod';

import {
  Button,
  Chip,
  Input,
  Screen,
  Segmented,
  Stepper,
} from '@/components/ui';
import { calculateGoals } from '@/lib/nutrition';
import type { ActivityLevel, Gender } from '@/lib/types';
import { useUpsertProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';

const requiredNumber = (msg = 'Required') =>
  z.number({ error: (issue) => (issue.input === undefined ? msg : 'Enter a number') });

const schema = z.object({
  full_name: z.string().min(1, 'Required').max(80, 'Too long'),
  age: requiredNumber()
    .int('Whole numbers only')
    .min(13, 'Must be 13+')
    .max(120, 'That seems too high'),
  gender: z.enum(['male', 'female', 'other']),
  height_cm: requiredNumber()
    .min(80, 'Must be 80+ cm')
    .max(250, 'That seems too high'),
  weight_kg: requiredNumber()
    .min(25, 'Must be 25+ kg')
    .max(400, 'That seems too high'),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  medical_conditions: z.array(z.string()),
  dietary_preferences: z.array(z.string()),
});
type FormValues = z.infer<typeof schema>;

const GENDER_OPTIONS = [
  { value: 'male' as const, label: 'Male' },
  { value: 'female' as const, label: 'Female' },
  { value: 'other' as const, label: 'Other' },
] satisfies ReadonlyArray<{ value: Gender; label: string }>;

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

export default function ProfileSetup() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const upsert = useUpsertProfile();
  const [step, setStep] = useState<0 | 1 | 2>(0);

  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      full_name: '',
      age: undefined as unknown as number,
      gender: undefined as unknown as Gender,
      height_cm: undefined as unknown as number,
      weight_kg: undefined as unknown as number,
      activity_level: undefined as unknown as ActivityLevel,
      medical_conditions: [],
      dietary_preferences: [],
    },
  });

  const stepFields: Record<0 | 1 | 2, ReadonlyArray<keyof FormValues>> = {
    0: ['full_name', 'age', 'gender'],
    1: ['height_cm', 'weight_kg', 'activity_level'],
    2: ['medical_conditions', 'dietary_preferences'],
  };

  const goNext = async () => {
    const ok = await trigger(stepFields[step] as (keyof FormValues)[]);
    if (!ok) return;
    if (step < 2) setStep(((step + 1) as 0 | 1 | 2));
  };

  const goBack = () => {
    if (step === 0) return;
    setStep(((step - 1) as 0 | 1 | 2));
  };

  const onSubmit = async (values: FormValues) => {
    if (!user?.email) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    const goals = calculateGoals({
      weightKg: values.weight_kg,
      heightCm: values.height_cm,
      age: values.age,
      gender: values.gender,
      activityLevel: values.activity_level,
    });
    try {
      await upsert.mutateAsync({
        email: user.email,
        full_name: values.full_name,
        age: values.age,
        gender: values.gender,
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
        daily_water_goal_ml: 2500,
        theme: 'dark',
        notifications_enabled: true,
      });
      router.replace('/(tabs)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save profile.';
      Alert.alert('Save failed', msg);
    }
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="px-6 pt-4">
          <Stepper current={step} total={3} />
          <Text className="text-fg-dim mt-3 text-xs uppercase tracking-button">
            Step {step + 1} of 3
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-6 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 ? (
            <StepOne control={control} errors={errors} />
          ) : step === 1 ? (
            <StepTwo control={control} errors={errors} />
          ) : (
            <StepThree control={control} />
          )}
        </ScrollView>

        <View className="border-border-dim flex-row gap-3 border-t px-6 py-4">
          <View className="flex-1">
            {step > 0 ? (
              <Button variant="ghost" onPress={goBack}>
                Back
              </Button>
            ) : (
              <Button variant="ghost" onPress={signOut}>
                Sign out
              </Button>
            )}
          </View>
          <View className="flex-1">
            {step < 2 ? (
              <Button onPress={goNext}>Continue</Button>
            ) : (
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={upsert.isPending}
              >
                Finish
              </Button>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

type StepProps = {
  control: ReturnType<typeof useForm<FormValues>>['control'];
  errors: ReturnType<typeof useForm<FormValues>>['formState']['errors'];
};

function StepOne({ control, errors }: StepProps) {
  return (
    <View className="gap-5">
      <View>
        <Text className="text-fg text-3xl font-bold tracking-tight">
          Tell us about you
        </Text>
        <Text className="text-fg-muted mt-2 text-sm">
          We'll use this to set your daily calorie and macro goals.
        </Text>
      </View>

      <Controller
        control={control}
        name="full_name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Full name"
            placeholder="Nishant Mishra"
            autoComplete="name"
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
            placeholder="e.g. 28"
            keyboardType="numeric"
            value={value !== undefined && !Number.isNaN(value) ? String(value) : ''}
            onChangeText={(t) => onChange(t === '' ? undefined : Number(t))}
            onBlur={onBlur}
            error={errors.age?.message}
          />
        )}
      />

      <View>
        <Text className="text-fg-muted mb-2 text-sm font-medium">Gender</Text>
        <Controller
          control={control}
          name="gender"
          render={({ field: { onChange, value } }) => (
            <Segmented
              options={GENDER_OPTIONS}
              value={value}
              onChange={onChange}
            />
          )}
        />
        {errors.gender ? (
          <Text className="text-danger mt-1 text-xs">Pick one</Text>
        ) : null}
      </View>
    </View>
  );
}

function StepTwo({ control, errors }: StepProps) {
  return (
    <View className="gap-5">
      <View>
        <Text className="text-fg text-3xl font-bold tracking-tight">
          Body & activity
        </Text>
        <Text className="text-fg-muted mt-2 text-sm">
          Used to estimate your daily energy needs (TDEE).
        </Text>
      </View>

      <View className="flex-row gap-4">
        <View className="flex-1">
          <Controller
            control={control}
            name="height_cm"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Height (cm)"
                placeholder="170"
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
                placeholder="68"
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
        {errors.activity_level ? (
          <Text className="text-danger mt-1 text-xs">Pick one</Text>
        ) : null}
      </View>
    </View>
  );
}

function StepThree({ control }: { control: StepProps['control'] }) {
  return (
    <View className="gap-6">
      <View>
        <Text className="text-fg text-3xl font-bold tracking-tight">
          Anything else?
        </Text>
        <Text className="text-fg-muted mt-2 text-sm">
          Optional. We'll factor these into recommendations.
        </Text>
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
    </View>
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
