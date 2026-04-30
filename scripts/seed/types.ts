// Shape that all sources normalize to before insertion into public.foods.
// Mirrors the foods table; per-100g basis except where noted.

export type SeedFood = {
  source: 'ifct' | 'usda' | 'openfoodfacts';
  external_id: string;
  name: string;
  name_hindi: string | null;
  brand: string | null;
  category: string | null;
  cuisine: string | null;
  serving_size_g: number; // always 100 for IFCT/USDA; for OFF we still normalize per-100g
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
  extra_nutrients: Record<string, number>;
};

export const USER_AGENT = 'NutriTrack-Seed/0.1 (nishant@joveo.com)';

export function safeNum(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
