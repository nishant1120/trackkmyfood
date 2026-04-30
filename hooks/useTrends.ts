import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export type DayBucket = {
  date: string; // YYYY-MM-DD (local)
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fibre_g: number;
  water_ml: number;
  hasFood: boolean;
};

export type WeightPoint = {
  date: string;
  weight_kg: number;
};

export type TrendsData = {
  days: DayBucket[]; // chronological, oldest→newest, exactly `windowDays` entries
  weights: WeightPoint[]; // chronological
  totalDaysLogged: number;
  longestStreak: number;
  avgDailyKcal: number; // average over days where hasFood
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function emptyDay(date: string): DayBucket {
  return {
    date,
    calories_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fats_g: 0,
    fibre_g: 0,
    water_ml: 0,
    hasFood: false,
  };
}

function buildDateRange(windowDays: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(ymd(d));
  }
  return out;
}

function longestConsecutive(daysWithFood: Set<string>): number {
  if (daysWithFood.size === 0) return 0;
  const sorted = [...daysWithFood].sort();
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const next = new Date(sorted[i]);
    const diff = Math.round(
      (next.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff === 1) {
      cur++;
      best = Math.max(best, cur);
    } else {
      cur = 1;
    }
  }
  return best;
}

export function useTrends(windowDays: number = 56) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['trends', userId ?? 'anon', windowDays] as const,
    enabled: !!userId,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<TrendsData> => {
      if (!userId) {
        return {
          days: [],
          weights: [],
          totalDaysLogged: 0,
          longestStreak: 0,
          avgDailyKcal: 0,
        };
      }
      const since = new Date();
      since.setDate(since.getDate() - (windowDays - 1));
      since.setHours(0, 0, 0, 0);

      const [foodRes, waterRes, weightRes] = await Promise.all([
        supabase
          .from('food_logs')
          .select(
            'consumed_at, calories_kcal, protein_g, carbs_g, fats_g, fibre_g'
          )
          .eq('user_id', userId)
          .gte('consumed_at', since.toISOString()),
        supabase
          .from('water_logs')
          .select('consumed_at, amount_ml')
          .eq('user_id', userId)
          .gte('consumed_at', since.toISOString()),
        supabase
          .from('weight_logs')
          .select('logged_at, weight_kg')
          .eq('user_id', userId)
          .order('logged_at', { ascending: true }),
      ]);

      if (foodRes.error) throw foodRes.error;
      if (waterRes.error) throw waterRes.error;
      if (weightRes.error) throw weightRes.error;

      // Initialize the date range with empty buckets
      const dates = buildDateRange(windowDays);
      const map = new Map<string, DayBucket>();
      for (const d of dates) map.set(d, emptyDay(d));

      for (const log of foodRes.data ?? []) {
        const d = ymd(new Date(log.consumed_at));
        const bucket = map.get(d);
        if (!bucket) continue;
        bucket.hasFood = true;
        bucket.calories_kcal += Number(log.calories_kcal) || 0;
        bucket.protein_g += Number(log.protein_g) || 0;
        bucket.carbs_g += Number(log.carbs_g) || 0;
        bucket.fats_g += Number(log.fats_g) || 0;
        bucket.fibre_g += Number(log.fibre_g) || 0;
      }
      for (const w of waterRes.data ?? []) {
        const d = ymd(new Date(w.consumed_at));
        const bucket = map.get(d);
        if (!bucket) continue;
        bucket.water_ml += Number(w.amount_ml) || 0;
      }

      const days = dates.map((d) => map.get(d)!);
      const daysWithFood = new Set(days.filter((d) => d.hasFood).map((d) => d.date));
      const longestStreak = longestConsecutive(daysWithFood);

      const loggedDays = days.filter((d) => d.hasFood);
      const avgDailyKcal =
        loggedDays.length > 0
          ? Math.round(
              loggedDays.reduce((s, d) => s + d.calories_kcal, 0) /
                loggedDays.length
            )
          : 0;

      const weights: WeightPoint[] = (weightRes.data ?? []).map((w) => ({
        date: ymd(new Date(w.logged_at)),
        weight_kg: Number(w.weight_kg) || 0,
      }));

      return {
        days,
        weights,
        totalDaysLogged: daysWithFood.size,
        longestStreak,
        avgDailyKcal,
      };
    },
  });
}
