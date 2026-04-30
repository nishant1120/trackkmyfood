import { useMutation, useQueryClient } from '@tanstack/react-query';

import { haptic } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function useAddWeight() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (weight_kg: number): Promise<void> => {
      if (!userId) throw new Error('not signed in');
      if (!Number.isFinite(weight_kg) || weight_kg < 20 || weight_kg > 400) {
        throw new Error('Weight must be between 20 and 400 kg.');
      }
      const { error } = await supabase
        .from('weight_logs')
        .insert({ user_id: userId, weight_kg });
      if (error) throw error;
    },
    onSuccess: () => {
      haptic.success();
      queryClient.invalidateQueries({
        queryKey: ['trends', userId],
        refetchType: 'all',
      });
    },
    onError: () => {
      haptic.error();
    },
  });
}
