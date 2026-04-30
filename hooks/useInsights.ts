import { useQuery } from '@tanstack/react-query';

import { callLLMJson } from '@/lib/llm';
import {
  buildDailyInsightPrompt,
  type DailyInsightInput,
  type DailyInsightResponse,
} from '@/lib/prompts';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';

import type { DailyTotals } from './useDailyTotals';

const CACHE_HOURS = 6;
const INSIGHT_TYPE = 'daily_summary';

type Args = {
  profile: Profile | null | undefined;
  totals: DailyTotals | undefined;
};

export type InsightsResult =
  | { kind: 'ok'; data: DailyInsightResponse; generatedAt: string; cached: boolean }
  | { kind: 'error'; message: string };

export function useInsights({ profile, totals }: Args) {
  const userId = useAuthStore((s) => s.user?.id);
  const ready = !!(userId && profile && totals);

  return useQuery({
    queryKey: ['insights', userId, profile?.id, totals?.calories_kcal] as const,
    enabled: ready,
    staleTime: 1000 * 60 * 30, // RQ-level: 30min
    queryFn: async (): Promise<InsightsResult> => {
      if (!userId || !profile || !totals) {
        return { kind: 'error', message: 'Not enough context to generate insights.' };
      }

      const cached = await fetchFreshCachedInsight(userId);
      if (cached) {
        return {
          kind: 'ok',
          data: cached.parsed,
          generatedAt: cached.generated_at,
          cached: true,
        };
      }

      const goals = {
        calories: profile.daily_calorie_goal ?? 2000,
        protein_g: profile.daily_protein_goal_g ?? 100,
        carbs_g: profile.daily_carbs_goal_g ?? 250,
        fats_g: profile.daily_fats_goal_g ?? 70,
        fibre_g: profile.daily_fibre_goal_g ?? 30,
        water_ml: profile.daily_water_goal_ml ?? 2500,
      };
      const recentFoods = totals.food_logs
        .slice(0, 6)
        .map((l) => `${l.quantity}${l.unit} ${(l.ai_food_data as { name?: string })?.name ?? l.notes ?? 'logged item'}`);

      const promptInput: DailyInsightInput = {
        profile: {
          full_name: profile.full_name,
          age: profile.age,
          gender: profile.gender,
          weight_kg: profile.weight_kg,
          height_cm: profile.height_cm,
          activity_level: profile.activity_level,
          medical_conditions: profile.medical_conditions,
          dietary_preferences: profile.dietary_preferences,
        },
        totals: {
          calories_kcal: round(totals.calories_kcal),
          protein_g: round(totals.protein_g),
          carbs_g: round(totals.carbs_g),
          fats_g: round(totals.fats_g),
          fibre_g: round(totals.fibre_g),
          water_ml: totals.water_ml,
        },
        goals,
        recentFoods,
        hourOfDay: new Date().getHours(),
      };

      const result = await callLLMJson<DailyInsightResponse>(
        buildDailyInsightPrompt(promptInput)
      );

      if (!result.ok) {
        return { kind: 'error', message: result.error.message };
      }

      // Persist the insight (best-effort; failure here doesn't break UX).
      const expiresAt = new Date(Date.now() + CACHE_HOURS * 60 * 60 * 1000).toISOString();
      const insertRes = await supabase.from('ai_insights').insert({
        user_id: userId,
        insight_type: INSIGHT_TYPE,
        content: JSON.stringify(result.data),
        data_snapshot: promptInput,
        expires_at: expiresAt,
      });
      if (insertRes.error) {
        console.warn('Failed to cache insight:', insertRes.error.message);
      }

      return {
        kind: 'ok',
        data: result.data,
        generatedAt: new Date().toISOString(),
        cached: false,
      };
    },
  });
}

async function fetchFreshCachedInsight(userId: string) {
  const since = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('ai_insights')
    .select('content, generated_at')
    .eq('user_id', userId)
    .eq('insight_type', INSIGHT_TYPE)
    .gte('generated_at', since)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  try {
    return {
      parsed: JSON.parse(data.content) as DailyInsightResponse,
      generated_at: data.generated_at as string,
    };
  } catch {
    return null;
  }
}

function round(n: number): number {
  return Math.round(n);
}
