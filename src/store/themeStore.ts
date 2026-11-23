import { create } from 'zustand';
import { readValue, writeValue } from '../services/mock/storage';

export type ThemeMode = 'light' | 'dark';

const KEY = 'themeMode';

interface ThemeState {
  mode: ThemeMode;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: readValue<ThemeMode | null>(KEY, null) ?? 'light',
  toggleMode: () => {
    const next: ThemeMode = get().mode === 'light' ? 'dark' : 'light';
    writeValue(KEY, next);
    set({ mode: next });
  },
}));
