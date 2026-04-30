import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Food } from '@/lib/types';

const SEARCH_DEBOUNCE_MS = 250;

// Convert a free-text query into a tsquery-compatible string for textSearch.
// We split on whitespace, drop punctuation, and join with " & " so that all
// terms must appear (AND), with `:*` suffix for prefix matching on the last
// token so "pan" matches "paneer".
function toTsQuery(raw: string): string | null {
  const tokens = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return null;
  const last = tokens.length - 1;
  return tokens.map((t, i) => (i === last ? `${t}:*` : t)).join(' & ');
}

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useFoodSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);

  return useQuery({
    queryKey: ['foods-search', debounced] as const,
    enabled: debounced.length >= 2,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<Food[]> => {
      const tsq = toTsQuery(debounced);
      if (!tsq) return [];

      // Primary: full-text on search_vector with prefix match on last token.
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .textSearch('search_vector', tsq, { config: 'english' })
        .limit(50);
      if (error) {
        // Fallback: ilike on name. textSearch can fail on weird inputs.
        const fallback = await supabase
          .from('foods')
          .select('*')
          .ilike('name', `%${debounced}%`)
          .limit(50);
        if (fallback.error) throw fallback.error;
        return (fallback.data ?? []) as Food[];
      }
      return (data ?? []) as Food[];
    },
  });
}

export function useFood(id: string | undefined) {
  return useQuery({
    queryKey: ['food', id ?? 'none'] as const,
    enabled: !!id,
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<Food | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as Food | null) ?? null;
    },
  });
}
