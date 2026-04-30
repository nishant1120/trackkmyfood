import { create } from 'zustand';

import type { ParsedFoodItem } from '@/lib/prompts';

// Holds the result of an AI text/vision parse so the confirm screen can pick
// it up without serializing the whole payload through route params. One-shot:
// the consumer calls take() to read-and-clear.

type State = {
  pending: { items: ParsedFoodItem[]; notes: string; sourceText?: string } | null;
  set: (
    items: ParsedFoodItem[],
    notes: string,
    sourceText?: string
  ) => void;
  take: () => State['pending'];
  clear: () => void;
};

export const useAiParseStore = create<State>((set, get) => ({
  pending: null,
  set: (items, notes, sourceText) => set({ pending: { items, notes, sourceText } }),
  take: () => {
    const v = get().pending;
    set({ pending: null });
    return v;
  },
  clear: () => set({ pending: null }),
}));
