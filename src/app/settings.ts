import { create } from 'zustand';

import { isOneOf } from '../engine/validate';
import { detectLanguage, LANGUAGES, type Language } from '../i18n';
import { THEME_PREFERENCES, type ThemePreference } from '../ui/theme/theme';

export interface SettingsValues {
  language: Language;
  theme: ThemePreference;
}

interface SettingsState extends SettingsValues {
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemePreference) => void;
}

export const useSettings = create<SettingsState>()((set) => ({
  language: detectLanguage(navigator.language),
  theme: 'system',
  setLanguage: (language) => {
    set({ language });
  },
  setTheme: (theme) => {
    set({ theme });
  },
}));

export function settingsValues({ language, theme }: SettingsValues): SettingsValues {
  return { language, theme };
}

/** Applies settings loaded from storage; unknown or outdated values keep their defaults. */
export function restoreSettings(values: Readonly<Record<string, unknown>>): void {
  const patch: Partial<SettingsValues> = {};
  if (isOneOf(LANGUAGES, values.language)) patch.language = values.language;
  if (isOneOf(THEME_PREFERENCES, values.theme)) patch.theme = values.theme;
  useSettings.setState(patch);
}
