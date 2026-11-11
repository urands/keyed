import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { detectLanguage, type Language } from '../i18n';
import type { ThemePreference } from '../ui/theme/theme';

interface SettingsState {
  language: Language;
  theme: ThemePreference;
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemePreference) => void;
}

// Kept in localStorage until the SQLite storage arrives (task 2.10).
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: detectLanguage(navigator.language),
      theme: 'system',
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'keyed.settings', version: 1 },
  ),
);
