import type { ActivityLevel, Gender } from './types';

// Mifflin-St Jeor BMR (kcal/day)
export function calculateBMR(opts: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
}): number {
  const { weightKg, heightCm, age, gender } = opts;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78; // 'other' — average of male/female adjustments
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

export type MacroGoals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  fibreG: number;
};

// Macros: Protein 25%, Carbs 45%, Fats 30% of TDEE
// Fibre: 14g per 1000 kcal
export function calculateMacroGoals(tdee: number): MacroGoals {
  const calories = Math.round(tdee);
  return {
    calories,
    proteinG: Math.round((calories * 0.25) / 4), // 4 kcal/g
    carbsG: Math.round((calories * 0.45) / 4),
    fatsG: Math.round((calories * 0.3) / 9), // 9 kcal/g
    fibreG: Math.round((calories / 1000) * 14),
  };
}

export function calculateGoals(opts: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
}): MacroGoals {
  const bmr = calculateBMR(opts);
  const tdee = calculateTDEE(bmr, opts.activityLevel);
  return calculateMacroGoals(tdee);
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export type BMICategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export function bmiCategory(bmi: number): BMICategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}
