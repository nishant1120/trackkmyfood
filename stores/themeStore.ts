import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { Theme } from '@/lib/types';

const STORAGE_KEY = 'nutritrack-theme';

type State = {
  theme: Theme;
  hydrated: boolean;
  setTheme: (theme: Theme) => void;
  hydrate: () => Promise<void>;
};

// Manual AsyncStorage persistence. We avoid zustand/middleware here because
// its bundled output references `import.meta.env`, which Metro can't transform
// for the web target — every code path in `zustand/middleware.js` (devtools,
// persist, redux, etc.) is included even when only persist is imported.
export const useThemeStore = create<State>((set, get) => ({
  theme: 'dark',
  hydrated: false,
  setTheme: (theme) => {
    set({ theme });
    // Fire and forget — keep the API synchronous for callers.
    AsyncStorage.setItem(STORAGE_KEY, theme).catch(() => {});
  },
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light' || stored === 'system') {
        set({ theme: stored });
      }
    } catch {
      // ignore — keep default
    }
    set({ hydrated: true });
  },
}));
