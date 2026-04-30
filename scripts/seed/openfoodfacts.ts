import { safeNum, USER_AGENT, type SeedFood } from './types';

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

type OffProduct = {
  code: string;
  product_name?: string;
  brands?: string;
  categories_tags?: string[];
  nutriments?: OffNutriments;
};

const FIELDS = [
  'code',
  'product_name',
  'brands',
  'categories_tags',
  'nutriments',
].join(',');

function deriveCategory(tags: string[] | undefined): string | null {
  if (!tags || !tags.length) return null;
  // tags look like "en:beverages", "en:dairy" — pick the first English tag,
  // strip prefix and replace dashes.
  for (const t of tags) {
    if (t.startsWith('en:')) {
      return t.slice(3).replace(/-/g, ' ');
    }
  }
  return null;
}

function normalize(p: OffProduct): SeedFood | null {
  const n = p.nutriments ?? {};
  const name = (p.product_name ?? '').trim();
  if (!name) return null;
  if (!p.code) return null;

  // Energy: prefer kcal_100g, otherwise convert energy_100g (kJ).
  let calories = safeNum(n['energy-kcal_100g']);
  if (calories <= 0 && n.energy_100g) calories = safeNum(n.energy_100g) / 4.184;

  const protein = safeNum(n.proteins_100g);
  const carbs = safeNum(n.carbohydrates_100g);
  const fats = safeNum(n.fat_100g);

  // Quality gate: must have at least kcal + one macro to be useful.
  if (calories <= 0) return null;
  if (protein <= 0 && carbs <= 0 && fats <= 0) return null;

  // OFF reports vitamins/minerals in grams per 100g (their `_100g` convention).
  const vitA_g = safeNum(n['vitamin-a_100g']);
  const vitC_g = safeNum(n['vitamin-c_100g']);
  const vitD_g = safeNum(n['vitamin-d_100g']);
  const vitB12_g = safeNum(n['vitamin-b12_100g']);
  const iron_g = safeNum(n.iron_100g);
  const calcium_g = safeNum(n.calcium_100g);

  return {
    source: 'openfoodfacts',
    external_id: p.code,
    name,
    name_hindi: null,
    brand: (p.brands ?? '').split(',')[0]?.trim() || null,
    category: deriveCategory(p.categories_tags),
    cuisine: 'indian',
    serving_size_g: 100,
    calories_kcal: round(calories, 1),
    protein_g: round(protein, 2),
    carbs_g: round(carbs, 2),
    fats_g: round(fats, 2),
    fibre_g: round(safeNum(n.fiber_100g), 2),
    vitamin_a_mcg: round(vitA_g * 1_000_000, 2),
    vitamin_c_mg: round(vitC_g * 1000, 2),
    vitamin_d_mcg: round(vitD_g * 1_000_000, 3),
    vitamin_b12_mcg: round(vitB12_g * 1_000_000, 3),
    iron_mg: round(iron_g * 1000, 3),
    calcium_mg: round(calcium_g * 1000, 1),
    extra_nutrients: {},
  };
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export async function fetchOFF(opts: { maxRows: number }): Promise<SeedFood[]> {
  const out: SeedFood[] = [];
  const seen = new Set<string>();
  const pageSize = 200;
  let page = 1;

  while (out.length < opts.maxRows) {
    const url =
      `https://world.openfoodfacts.org/api/v2/search` +
      `?countries_tags=india&page_size=${pageSize}&page=${page}&fields=${FIELDS}`;
    console.log(`[off] fetching page ${page} (have ${out.length})`);
    const data = await fetchWithRetry(url, 4);
    if (!data) {
      console.warn(`[off] giving up on page ${page} after retries`);
      break;
    }
    const products = data.products ?? [];
    if (!products.length) break;

    for (const p of products) {
      if (!p.code || seen.has(p.code)) continue;
      seen.add(p.code);
      const norm = normalize(p);
      if (norm) out.push(norm);
      if (out.length >= opts.maxRows) break;
    }

    if (data.page_count && page >= data.page_count) break;
    page++;

    // gentle pacing to be a good citizen on a free API
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`[off] kept ${out.length} rows`);
  return out;
}

type OffSearchResponse = {
  products?: OffProduct[];
  page_count?: number;
  page?: number;
};

async function fetchWithRetry(
  url: string,
  maxAttempts: number
): Promise<OffSearchResponse | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.ok) {
        return (await res.json()) as OffSearchResponse;
      }
      if (res.status >= 500 || res.status === 429) {
        const wait = 2 ** attempt * 1000; // 2s, 4s, 8s, 16s
        console.warn(`[off] HTTP ${res.status} on attempt ${attempt}; backing off ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw new Error(`OFF fetch failed: ${res.status}`);
    } catch (err) {
      if (attempt === maxAttempts) {
        console.error(`[off] final attempt failed:`, err instanceof Error ? err.message : err);
        return null;
      }
      const wait = 2 ** attempt * 1000;
      console.warn(`[off] error on attempt ${attempt}; backing off ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  return null;
}
