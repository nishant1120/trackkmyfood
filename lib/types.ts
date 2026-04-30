// Shared application types

export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Unit = 'g' | 'ml' | 'cup' | 'piece' | 'serving';
export type FoodSource =
  | 'ifct'
  | 'usda'
  | 'openfoodfacts'
  | 'user_generated'
  | 'ai_generated';
export type LoggedVia = 'search' | 'camera' | 'ai_text' | 'barcode' | 'template';
export type Theme = 'dark' | 'light' | 'system';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  age: number;
  gender: Gender;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  medical_conditions: string[] | null;
  dietary_preferences: string[] | null;
  daily_calorie_goal: number | null;
  daily_protein_goal_g: number | null;
  daily_carbs_goal_g: number | null;
  daily_fats_goal_g: number | null;
  daily_fibre_goal_g: number | null;
  daily_water_goal_ml: number | null;
  theme: Theme;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type Food = {
  id: string;
  source: FoodSource;
  external_id: string | null;
  name: string;
  name_hindi: string | null;
  brand: string | null;
  category: string | null;
  cuisine: string | null;
  serving_size_g: number;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fibre_g: number;
  vitamin_a_mcg: number;
  vitamin_c_mg: number;
  vitamin_d_mcg: number;
  vitamin_b12_mcg: number;
  iron_mg: number;
  calcium_mg: number;
  extra_nutrients: Record<string, number> | null;
  created_at: string;
};

export type FoodLog = {
  id: string;
  user_id: string;
  food_id: string | null;
  ai_food_data: Record<string, unknown> | null;
  meal_type: MealType | null;
  quantity: number;
  unit: Unit;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fibre_g: number;
  vitamin_a_mcg: number;
  vitamin_c_mg: number;
  vitamin_d_mcg: number;
  vitamin_b12_mcg: number;
  iron_mg: number;
  calcium_mg: number;
  logged_via: LoggedVia;
  photo_url: string | null;
  notes: string | null;
  consumed_at: string;
  created_at: string;
};
