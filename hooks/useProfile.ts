import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';

export const profileKey = (userId: string | undefined) =>
  ['profile', userId ?? 'anon'] as const;

export function useProfile() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: profileKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });
}

export type ProfileUpsertInput = Omit<
  Profile,
  'id' | 'created_at' | 'updated_at'
>;

export function useUpsertProfile() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (input: ProfileUpsertInput): Promise<Profile> => {
      if (!userId) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...input }, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileKey(userId), data);
    },
  });
}
