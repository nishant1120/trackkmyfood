// Live Open Food Facts client. Used by the barcode flow when a scan doesn't
// match our seeded `foods` rows.

import type { Food } from './types';

type OffNutriments = {
  ['energy-kcal_100g']?: number;
  energy_100g?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  ['vitamin-a_100g']?: number;
  ['vitamin-c_100g']?: number;
  ['vitamin-d_100g']?: number;
  ['vitamin-b12_100g']?: number;
  iron_100g?: number;
  calcium_100g?: number;
};

type OffProductResponse = {
  status: 0 | 1;
  status_verbose?: string;
  product?: {
    code: string;
    product_name?: string;
    brands?: string;
    categories_tags?: string[];
    nutriments?: OffNutriments;
  };
};

const FIELDS = [
  'code',
  'product_name',
  'brands',
  'categories_tags',
  'nutriments',
].join(',');

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function deriveCategory(tags: string[] | undefined): string | null {
  if (!tags?.length) return null;
  for (const t of tags) {
    if (t.startsWith('en:')) return t.slice(3).replace(/-/g, ' ');
  }
  return null;
}

export type OffLookupResult =
  | { kind: 'ok'; food: Omit<Food, 'id' | 'created_at'> }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string };

export async function lookupBarcode(barcode: string): Promise<OffLookupResult> {
  const trimmed = barcode.trim();
  if (!/^\d{6,14}$/.test(trimmed)) {
    return { kind: 'error', message: 'Barcode must be 6–14 digits.' };
  }
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${trimmed}.json?fields=${FIELDS}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'NutriTrack/0.1 (nishant@joveo.com)',
      },
    });
    if (res.status === 404) {
      return { kind: 'not_found' };
    }
    if (!res.ok) {
      return {
        kind: 'error',
        message: `OFF returned HTTP ${res.status}.`,
      };
    }
    const data = (await res.json()) as OffProductResponse;
    if (data.status !== 1 || !data.product) {
      return { kind: 'not_found' };
    }
    const p = data.product;
    const n = p.nutriments ?? {};

    let calories = num(n['energy-kcal_100g']);
    if (calories <= 0 && n.energy_100g) calories = num(n.energy_100g) / 4.184;

    const protein = num(n.proteins_100g);
    const carbs = num(n.carbohydrates_100g);
    const fats = num(n.fat_100g);

    if (calories <= 0 && protein <= 0 && carbs <= 0 && fats <= 0) {
      // Found the product but it has no usable nutrition data (very common
      // for OFF user-submitted entries).
      return {
        kind: 'error',
        message: 'Product found but missing nutrition data on Open Food Facts.',
      };
    }

    const food: Omit<Food, 'id' | 'created_at'> = {
      source: 'openfoodfacts',
      external_id: p.code,
      name: (p.product_name ?? '').trim() || `Product ${p.code}`,
      name_hindi: null,
      brand: (p.brands ?? '').split(',')[0]?.trim() || null,
      category: deriveCategory(p.categories_tags),
      cuisine: null,
      serving_size_g: 100,
      calories_kcal: round(calories, 1),
      protein_g: round(protein, 2),
      carbs_g: round(carbs, 2),
      fats_g: round(fats, 2),
      fibre_g: round(num(n.fiber_100g), 2),
      vitamin_a_mcg: round(num(n['vitamin-a_100g']) * 1_000_000, 2),
      vitamin_c_mg: round(num(n['vitamin-c_100g']) * 1000, 2),
      vitamin_d_mcg: round(num(n['vitamin-d_100g']) * 1_000_000, 3),
      vitamin_b12_mcg: round(num(n['vitamin-b12_100g']) * 1_000_000, 3),
      iron_mg: round(num(n.iron_100g) * 1000, 3),
      calcium_mg: round(num(n.calcium_100g) * 1000, 1),
      extra_nutrients: null,
    };
    return { kind: 'ok', food };
  } catch (err) {
    return {
      kind: 'error',
      message: err instanceof Error ? err.message : 'Network error reaching Open Food Facts.',
    };
  }
}
