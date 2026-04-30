import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { Theme } from '@/lib/types';

type State = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

// Persisted user preference. Visual application across the app is wired
// progressively — Phase 11 captures the choice; Phase 12 polish completes
// the light-mode token wiring.
export const useThemeStore = create<State>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'nutritrack-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
