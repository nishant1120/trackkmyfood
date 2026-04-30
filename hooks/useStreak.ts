import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export type StreakInfo = {
  currentStreak: number;
  totalDaysLogged: number;
  lastLogDate: string | null;
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function useStreak() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['streak', userId ?? 'anon'] as const,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<StreakInfo> => {
      if (!userId) throw new Error('not signed in');
      // Pull only dates we need — last 60 days is more than enough for a streak.
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const { data, error } = await supabase
        .from('food_logs')
        .select('consumed_at')
        .eq('user_id', userId)
        .gte('consumed_at', sixtyDaysAgo.toISOString());
      if (error) throw error;

      const days = new Set<string>();
      for (const row of data ?? []) {
        days.add(ymd(new Date(row.consumed_at)));
      }
      if (days.size === 0) {
        return { currentStreak: 0, totalDaysLogged: 0, lastLogDate: null };
      }

      const today = new Date();
      const todayKey = ymd(today);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = ymd(yesterday);

      // Current streak: consecutive days ending today (or yesterday if today
      // hasn't been logged yet).
      let cursor = days.has(todayKey)
        ? today
        : days.has(yesterdayKey)
          ? yesterday
          : null;
      let streak = 0;
      while (cursor && days.has(ymd(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }

      const sorted = [...days].sort();
      const lastLogDate = sorted[sorted.length - 1] ?? null;
      const totalDaysLogged = days.size;

      // Sanity: also consider longer streaks in our 60-day window for stability,
      // but the spec wants "current" streak so we keep that semantic.
      void daysBetween;

      return { currentStreak: streak, totalDaysLogged, lastLogDate };
    },
  });
}
