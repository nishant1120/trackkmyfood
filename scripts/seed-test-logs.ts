// One-shot helper: insert a few representative food + water logs for the
// dev test user so the dashboard has something to show.
// Run with: npm run seed:test-logs (or directly: npx tsx scripts/seed-test-logs.ts)

import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Hard-coded dev user (the one whose password we set in Phase 1).
const USER_ID = 'fbcf8c11-e7be-47c6-b766-bb2c2c343c95';

async function main() {
  // Wipe existing test logs for today so re-runs are clean.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  await supabase
    .from('food_logs')
    .delete()
    .eq('user_id', USER_ID)
    .gte('consumed_at', startOfDay.toISOString());
  await supabase
    .from('water_logs')
    .delete()
    .eq('user_id', USER_ID)
    .gte('consumed_at', startOfDay.toISOString());

  // Pick a few foods from the seeded DB to reference in logs.
  // We pick by patterns we know exist in the IFCT seed (verified during Phase 3).
  const idli = await pickFood('rice');
  const dal = await pickFood('Bengal gram, dal');
  const roti = await pickFood('Wheat');

  const now = new Date();
  const breakfast = new Date(now);
  breakfast.setHours(8, 30, 0, 0);
  const lunch = new Date(now);
  lunch.setHours(13, 15, 0, 0);

  const logs = [
    idli && {
      user_id: USER_ID,
      food_id: idli.id,
      meal_type: 'breakfast' as const,
      quantity: 200, // 200g of idlis
      unit: 'g' as const,
      calories_kcal: scale(idli.calories_kcal, 200, idli.serving_size_g),
      protein_g: scale(idli.protein_g, 200, idli.serving_size_g),
      carbs_g: scale(idli.carbs_g, 200, idli.serving_size_g),
      fats_g: scale(idli.fats_g, 200, idli.serving_size_g),
      fibre_g: scale(idli.fibre_g, 200, idli.serving_size_g),
      iron_mg: scale(idli.iron_mg, 200, idli.serving_size_g),
      calcium_mg: scale(idli.calcium_mg, 200, idli.serving_size_g),
      vitamin_c_mg: scale(idli.vitamin_c_mg, 200, idli.serving_size_g),
      ai_food_data: { name: idli.name },
      logged_via: 'search' as const,
      consumed_at: breakfast.toISOString(),
    },
    dal && {
      user_id: USER_ID,
      food_id: dal.id,
      meal_type: 'lunch' as const,
      quantity: 150,
      unit: 'g' as const,
      calories_kcal: scale(dal.calories_kcal, 150, dal.serving_size_g),
      protein_g: scale(dal.protein_g, 150, dal.serving_size_g),
      carbs_g: scale(dal.carbs_g, 150, dal.serving_size_g),
      fats_g: scale(dal.fats_g, 150, dal.serving_size_g),
      fibre_g: scale(dal.fibre_g, 150, dal.serving_size_g),
      iron_mg: scale(dal.iron_mg, 150, dal.serving_size_g),
      calcium_mg: scale(dal.calcium_mg, 150, dal.serving_size_g),
      ai_food_data: { name: dal.name },
      logged_via: 'search' as const,
      consumed_at: lunch.toISOString(),
    },
    roti && {
      user_id: USER_ID,
      food_id: roti.id,
      meal_type: 'lunch' as const,
      quantity: 80,
      unit: 'g' as const,
      calories_kcal: scale(roti.calories_kcal, 80, roti.serving_size_g),
      protein_g: scale(roti.protein_g, 80, roti.serving_size_g),
      carbs_g: scale(roti.carbs_g, 80, roti.serving_size_g),
      fats_g: scale(roti.fats_g, 80, roti.serving_size_g),
      fibre_g: scale(roti.fibre_g, 80, roti.serving_size_g),
      iron_mg: scale(roti.iron_mg, 80, roti.serving_size_g),
      calcium_mg: scale(roti.calcium_mg, 80, roti.serving_size_g),
      ai_food_data: { name: roti.name },
      logged_via: 'search' as const,
      consumed_at: new Date(lunch.getTime() + 5 * 60_000).toISOString(),
    },
  ].filter(Boolean);

  if (logs.length === 0) {
    console.log('No matching foods found in DB; nothing to insert.');
    return;
  }
  const { error: foodErr } = await supabase.from('food_logs').insert(logs);
  if (foodErr) {
    console.error('Insert food_logs failed:', foodErr);
    return;
  }

  const { error: waterErr } = await supabase.from('water_logs').insert([
    { user_id: USER_ID, amount_ml: 500, consumed_at: breakfast.toISOString() },
    { user_id: USER_ID, amount_ml: 250, consumed_at: lunch.toISOString() },
  ]);
  if (waterErr) {
    console.error('Insert water_logs failed:', waterErr);
    return;
  }

  console.log(`Inserted ${logs.length} food logs and 2 water logs for today.`);
}

function scale(value: unknown, qty: number, base: unknown): number {
  const v = Number(value) || 0;
  const b = Number(base) || 100;
  return Math.round(((v * qty) / b) * 100) / 100;
}

async function pickFood(pattern: string) {
  const { data } = await supabase
    .from('foods')
    .select('*')
    .ilike('name', `%${pattern}%`)
    .eq('source', 'ifct')
    .limit(1)
    .maybeSingle();
  return data;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
