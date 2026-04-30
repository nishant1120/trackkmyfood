import { safeNum, type SeedFood } from './types';

const BASE = 'https://api.nal.usda.gov/fdc/v1';

type UsdaNutrient = {
  nutrientId?: number;
  nutrientName?: string;
  value?: number;
  unitName?: string;
};
type UsdaFood = {
  fdcId: number;
  description: string;
  foodCategory?: string;
  dataType?: string;
  scientificName?: string;
  foodNutrients?: UsdaNutrient[];
};

// Map a normalized lookup of name -> nutrient.
function nutrientMap(food: UsdaFood) {
  const m = new Map<string, UsdaNutrient>();
  for (const n of food.foodNutrients ?? []) {
    if (!n.nutrientName) continue;
    // Prefer the first occurrence; later duplicates (e.g. Energy in kJ vs kcal)
    // are handled by checking unit explicitly.
    const key = n.nutrientName.toLowerCase();
    if (!m.has(key)) m.set(key, n);
  }
  return m;
}

function pickEnergyKcal(food: UsdaFood): number {
  for (const n of food.foodNutrients ?? []) {
    if (n.nutrientName === 'Energy' && (n.unitName ?? '').toUpperCase() === 'KCAL') {
      return safeNum(n.value);
    }
  }
  // Fallback: convert kJ if that's all we have
  for (const n of food.foodNutrients ?? []) {
    if (n.nutrientName === 'Energy' && (n.unitName ?? '').toUpperCase() === 'KJ') {
      return safeNum(n.value) / 4.184;
    }
  }
  return 0;
}

function pickVitaminD(food: UsdaFood): number {
  // USDA may report "Vitamin D (D2 + D3)" in mcg, or "Vitamin D (D2 + D3), International Units"
  for (const n of food.foodNutrients ?? []) {
    if (
      n.nutrientName === 'Vitamin D (D2 + D3)' &&
      (n.unitName ?? '').toUpperCase() === 'UG'
    ) {
      return safeNum(n.value);
    }
  }
  for (const n of food.foodNutrients ?? []) {
    if (
      n.nutrientName?.startsWith('Vitamin D (D2 + D3)') &&
      (n.unitName ?? '').toUpperCase() === 'IU'
    ) {
      // 1 IU vit D = 0.025 mcg
      return safeNum(n.value) * 0.025;
    }
  }
  return 0;
}

function normalize(food: UsdaFood): SeedFood | null {
  const map = nutrientMap(food);

  const calories = pickEnergyKcal(food);
  const protein = safeNum(map.get('protein')?.value);
  const fats = safeNum(map.get('total lipid (fat)')?.value);
  const carbs = safeNum(map.get('carbohydrate, by difference')?.value);
  const fibre = safeNum(map.get('fiber, total dietary')?.value);

  // Skip rows that have no useful macro data
  if (calories <= 0 && protein <= 0 && fats <= 0 && carbs <= 0) return null;

  return {
    source: 'usda',
    external_id: String(food.fdcId),
    name: food.description,
    name_hindi: null,
    brand: null,
    category: food.foodCategory ?? null,
    cuisine: null,
    serving_size_g: 100,
    calories_kcal: round(calories, 1),
    protein_g: round(protein, 2),
    carbs_g: round(carbs, 2),
    fats_g: round(fats, 2),
    fibre_g: round(fibre, 2),
    vitamin_a_mcg: round(safeNum(map.get('vitamin a, rae')?.value), 2),
    vitamin_c_mg: round(safeNum(map.get('vitamin c, total ascorbic acid')?.value), 2),
    vitamin_d_mcg: round(pickVitaminD(food), 3),
    vitamin_b12_mcg: round(safeNum(map.get('vitamin b-12')?.value), 3),
    iron_mg: round(safeNum(map.get('iron, fe')?.value), 3),
    calcium_mg: round(safeNum(map.get('calcium, ca')?.value), 1),
    extra_nutrients: {},
  };
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export async function fetchUSDA(opts: { maxRows: number }): Promise<SeedFood[]> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    console.warn('[usda] USDA_API_KEY missing; skipping');
    return [];
  }
  const out: SeedFood[] = [];
  const pageSize = 200; // USDA allows up to 200 per page on /search
  const seen = new Set<number>();

  let page = 1;
  while (out.length < opts.maxRows) {
    const url =
      `${BASE}/foods/search?api_key=${apiKey}` +
      `&dataType=Foundation,SR%20Legacy` +
      `&pageSize=${pageSize}&pageNumber=${page}` +
      `&query=*&sortBy=fdcId&sortOrder=asc`;
    console.log(`[usda] fetching page ${page} (have ${out.length})`);
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`USDA fetch failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const data = (await res.json()) as { foods?: UsdaFood[]; totalPages?: number };
    const foods = data.foods ?? [];
    if (!foods.length) break;

    for (const f of foods) {
      if (seen.has(f.fdcId)) continue;
      seen.add(f.fdcId);
      const norm = normalize(f);
      if (norm) out.push(norm);
      if (out.length >= opts.maxRows) break;
    }

    if (data.totalPages && page >= data.totalPages) break;
    page++;
  }
  console.log(`[usda] kept ${out.length} rows`);
  return out;
}
