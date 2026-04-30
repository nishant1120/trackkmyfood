import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { MealType, Unit } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';

// One item inside a template. Carries a full nutrition snapshot so applying
// a template never depends on re-fetching foods (some items are AI-generated
// and have no food_id).
export type TemplateItem = {
  name: string;
  name_hindi?: string | null;
  food_id: string | null;
  quantity: number;
  unit: Unit;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fibre_g: number;
};

export type MealTemplate = {
  id: string;
  user_id: string;
  name: string;
  meal_type: MealType | null;
  items: TemplateItem[];
  created_at: string;
};

export function useTemplates() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['templates', userId ?? 'anon'] as const,
    enabled: !!userId,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<MealTemplate[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('meal_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MealTemplate[];
    },
  });
}

export type CreateTemplateInput = {
  name: string;
  meal_type: MealType | null;
  items: TemplateItem[];
};

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (input: CreateTemplateInput): Promise<MealTemplate> => {
      if (!userId) throw new Error('not signed in');
      const { data, error } = await supabase
        .from('meal_templates')
        .insert({
          user_id: userId,
          name: input.name,
          meal_type: input.meal_type,
          items: input.items,
        })
        .select()
        .single();
      if (error) throw error;
      return data as MealTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', userId] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      const { error } = await supabase
        .from('meal_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', userId] });
    },
  });
}
