import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { FoodLog, LoggedVia, MealType, Unit } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';

export type FoodLogInput = {
  food_id: string | null;
  ai_food_data: Record<string, unknown> | null;
  meal_type: MealType | null;
  quantity: number;
  unit: Unit;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fibre_g: number;
  vitamin_a_mcg?: number;
  vitamin_c_mg?: number;
  vitamin_d_mcg?: number;
  vitamin_b12_mcg?: number;
  iron_mg?: number;
  calcium_mg?: number;
  logged_via: LoggedVia;
  photo_url?: string | null;
  notes?: string | null;
  consumed_at?: string;
};

export function useAddFoodLog() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (input: FoodLogInput): Promise<FoodLog> => {
      if (!userId) throw new Error('not signed in');
      const payload = {
        user_id: userId,
        consumed_at: input.consumed_at ?? new Date().toISOString(),
        ...input,
      };
      const { data, error } = await supabase
        .from('food_logs')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as FoodLog;
    },
    onSuccess: () => {
      // Invalidate every daily-totals query for the user, plus the streak.
      queryClient.invalidateQueries({ queryKey: ['daily-totals', userId] });
      queryClient.invalidateQueries({ queryKey: ['streak', userId] });
      // Insights depend on totals; force regeneration by invalidating.
      queryClient.invalidateQueries({ queryKey: ['insights', userId] });
    },
  });
}
