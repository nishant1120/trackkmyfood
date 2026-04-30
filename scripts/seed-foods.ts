import { config } from 'dotenv';
import { resolve } from 'node:path';

// Must run before importing anything that reads env at module load.
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

import { fetchIFCT } from './seed/ifct';
import { fetchOFF } from './seed/openfoodfacts';
import { fetchUSDA } from './seed/usda';
import type { SeedFood } from './seed/types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local'
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const targets = {
    usda: 1000,
    off: 600,
  };

  const args = new Set(process.argv.slice(2));
  const only = args.has('--only-ifct')
    ? new Set(['ifct'])
    : args.has('--only-usda')
      ? new Set(['usda'])
      : args.has('--only-off')
        ? new Set(['off'])
        : new Set(['ifct', 'usda', 'off']);
  const dryRun = args.has('--dry-run');

  console.log('Sources to fetch:', [...only].join(', '));

  const tasks: Promise<SeedFood[]>[] = [];
  if (only.has('ifct')) tasks.push(fetchIFCT().catch(failedSource('ifct')));
  if (only.has('usda'))
    tasks.push(fetchUSDA({ maxRows: targets.usda }).catch(failedSource('usda')));
  if (only.has('off'))
    tasks.push(fetchOFF({ maxRows: targets.off }).catch(failedSource('off')));

  const results = await Promise.all(tasks);
  const all = results.flat();

  // Dedupe by (source, external_id)
  const map = new Map<string, SeedFood>();
  for (const f of all) {
    const key = `${f.source}::${f.external_id}`;
    if (!map.has(key)) map.set(key, f);
  }

  // Sanity filter: drop rows that violate numeric(8,2) or have impossible macros
  const NUMERIC_FIELDS = [
    'calories_kcal',
    'protein_g',
    'carbs_g',
    'fats_g',
    'fibre_g',
    'vitamin_a_mcg',
    'vitamin_c_mg',
    'vitamin_d_mcg',
    'vitamin_b12_mcg',
    'iron_mg',
    'calcium_mg',
  ] as const;

  const beforeFilter = map.size;
  const unique = [...map.values()].filter((f) => {
    if (f.protein_g > 100 || f.carbs_g > 100 || f.fats_g > 100) return false;
    for (const fld of NUMERIC_FIELDS) {
      if (Math.abs(f[fld]) >= 1_000_000) return false;
    }
    return true;
  });
  if (unique.length < beforeFilter) {
    console.log(`Filtered out ${beforeFilter - unique.length} rows with bad data`);
  }

  console.log(`\nFetched: ${all.length} rows total, ${unique.length} after dedupe`);
  console.log('  by source:', countBy(unique, (f) => f.source));

  if (dryRun) {
    console.log('Dry run; not inserting.');
    console.log('Sample row:', JSON.stringify(unique[0], null, 2));
    return;
  }

  // Insert in batches. We use upsert on (source, external_id) so re-runs are idempotent.
  // Schema doesn't have a unique constraint on that pair though, so we just insert
  // skipping duplicates after first checking what's already in the DB.
  const existingKeys = await loadExistingKeys();
  console.log(`\nExisting rows in DB: ${existingKeys.size}`);

  const toInsert = unique.filter((f) => !existingKeys.has(`${f.source}::${f.external_id}`));
  console.log(`To insert: ${toInsert.length}`);

  if (toInsert.length === 0) {
    console.log('Nothing new to insert.');
  } else {
    await insertInBatches(toInsert, 200);
  }

  await sanityChecks();
}

async function loadExistingKeys(): Promise<Set<string>> {
  const set = new Set<string>();
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('foods')
      .select('source,external_id')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) set.add(`${r.source}::${r.external_id}`);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return set;
}

async function insertInBatches(rows: SeedFood[], batchSize: number) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from('foods').insert(batch);
    if (error) {
      console.error(
        `Batch ${i / batchSize + 1} failed: ${error.message}. First row in batch:`,
        batch[0]
      );
      throw error;
    }
    console.log(`  inserted ${i + batch.length}/${rows.length}`);
  }
}

async function sanityChecks() {
  console.log('\n--- sanity ---');
  const { count } = await supabase
    .from('foods')
    .select('*', { head: true, count: 'exact' });
  console.log(`Total foods: ${count}`);

  for (const term of ['dal', 'roti', 'apple', 'milk', 'paneer']) {
    const { data } = await supabase
      .from('foods')
      .select('name,source,calories_kcal')
      .ilike('name', `%${term}%`)
      .limit(3);
    console.log(`  "${term}":`, data?.length ?? 0, 'sample:', data?.[0]?.name);
  }
}

function failedSource(name: string) {
  return (err: unknown): SeedFood[] => {
    console.error(`[${name}] failed:`, err instanceof Error ? err.message : err);
    return [];
  };
}

function countBy<T>(arr: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of arr) {
    const k = key(a);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
