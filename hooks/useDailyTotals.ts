import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { FoodLog } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';

export type DailyTotals = {
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
  water_ml: number;
  food_logs: FoodLog[];
};

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

function dayBoundsISO(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export const dailyTotalsKey = (userId: string | undefined, date: string) =>
  ['daily-totals', userId ?? 'anon', date] as const;

// `date` is the local-day Date object. We bucket by the user's local day.
export function useDailyTotals(date: Date = new Date()) {
  const userId = useAuthStore((s) => s.user?.id);
  const dayKey = ymd(date);

  return useQuery({
    queryKey: dailyTotalsKey(userId, dayKey),
    enabled: !!userId,
    queryFn: async (): Promise<DailyTotals> => {
      if (!userId) throw new Error('not signed in');
      const { startISO, endISO } = dayBoundsISO(date);

      const [foodRes, waterRes] = await Promise.all([
        supabase
          .from('food_logs')
          .select('*')
          .eq('user_id', userId)
          .gte('consumed_at', startISO)
          .lt('consumed_at', endISO)
          .order('consumed_at', { ascending: false }),
        supabase
          .from('water_logs')
          .select('amount_ml')
          .eq('user_id', userId)
          .gte('consumed_at', startISO)
          .lt('consumed_at', endISO),
      ]);

      if (foodRes.error) throw foodRes.error;
      if (waterRes.error) throw waterRes.error;

      const logs = (foodRes.data ?? []) as FoodLog[];
      const totals: DailyTotals = {
        calories_kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fats_g: 0,
        fibre_g: 0,
        vitamin_a_mcg: 0,
        vitamin_c_mg: 0,
        vitamin_d_mcg: 0,
        vitamin_b12_mcg: 0,
        iron_mg: 0,
        calcium_mg: 0,
        water_ml: 0,
        food_logs: logs,
      };

      for (const log of logs) {
        for (const f of NUMERIC_FIELDS) {
          totals[f] += Number(log[f]) || 0;
        }
      }
      for (const w of waterRes.data ?? []) {
        totals.water_ml += Number(w.amount_ml) || 0;
      }

      return totals;
    },
  });
}

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
