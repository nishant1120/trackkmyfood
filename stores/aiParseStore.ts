import { create } from 'zustand';

import type { ParsedFoodItem } from '@/lib/prompts';

// Holds payloads in transit between log screens — text/vision parses on the
// way to ai-confirm, and the captured photo on the way to photo-confirm.
// Keeps large base64 strings out of route params (URLs choke on those).

type PendingParse = {
  items: ParsedFoodItem[];
  notes: string;
  sourceText?: string;
  loggedVia: 'ai_text' | 'camera';
};

type PendingPhoto = {
  base64: string;
  uri: string;
};

type State = {
  pending: PendingParse | null;
  pendingPhoto: PendingPhoto | null;
  set: (
    items: ParsedFoodItem[],
    notes: string,
    opts?: { sourceText?: string; loggedVia?: 'ai_text' | 'camera' }
  ) => void;
  take: () => PendingParse | null;
  setPhoto: (photo: PendingPhoto) => void;
  takePhoto: () => PendingPhoto | null;
  clear: () => void;
};

export const useAiParseStore = create<State>((set, get) => ({
  pending: null,
  pendingPhoto: null,
  set: (items, notes, opts) =>
    set({
      pending: {
        items,
        notes,
        sourceText: opts?.sourceText,
        loggedVia: opts?.loggedVia ?? 'ai_text',
      },
    }),
  take: () => {
    const v = get().pending;
    set({ pending: null });
    return v;
  },
  setPhoto: (photo) => set({ pendingPhoto: photo }),
  takePhoto: () => {
    const v = get().pendingPhoto;
    set({ pendingPhoto: null });
    return v;
  },
  clear: () => set({ pending: null, pendingPhoto: null }),
}));
