import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

import { dailyTotalsKey } from './useDailyTotals';

export function useAddWater() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (amount_ml: number) => {
      if (!userId) throw new Error('not signed in');
      const { error } = await supabase
        .from('water_logs')
        .insert({ user_id: userId, amount_ml });
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate every daily-totals query for this user; cheap.
      queryClient.invalidateQueries({ queryKey: ['daily-totals', userId] });
    },
  });
}
