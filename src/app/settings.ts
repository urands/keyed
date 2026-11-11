import { create } from 'zustand';

import type { InputMode } from '../engine/input/toInput';
import { LAYOUT_IDS, type LayoutId } from '../engine/layout/layout';
import { isOneOf } from '../engine/validate';
import { detectLanguage, LANGUAGES, type Language } from '../i18n';
import { THEME_PREFERENCES, type ThemePreference } from '../ui/theme/theme';

export const SPEED_UNIT_PREFERENCES = ['auto', 'wpm', 'cpm'] as const;
/** `auto` shows characters per minute for Russian and words per minute for English. */
export type SpeedUnitPreference = (typeof SPEED_UNIT_PREFERENCES)[number];

export const INPUT_MODES: readonly InputMode[] = ['emulate', 'system'];

export interface SettingsValues {
  language: Language;
  theme: ThemePreference;
  /** The layout being learned. */
  layout: LayoutId;
  speedUnit: SpeedUnitPreference;
  inputMode: InputMode;
  /** Only current confidence counts for opening keys (docs/learning-method.md). */
  strictMode: boolean;
}

interface SettingsState extends SettingsValues {
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemePreference) => void;
  update: (patch: Partial<SettingsValues>) => void;
}

/** The layout to start with: the one that matches the interface language. */
export function defaultLayoutFor(language: Language): LayoutId {
  return language === 'ru' ? 'ru-jcuken' : 'en-us-qwerty';
}

const language = detectLanguage(navigator.language);

export const useSettings = create<SettingsState>()((set) => ({
  language,
  theme: 'system',
  layout: defaultLayoutFor(language),
  speedUnit: 'auto',
  inputMode: 'emulate',
  strictMode: false,
  setLanguage: (value) => {
    set({ language: value });
  },
  setTheme: (theme) => {
    set({ theme });
  },
  update: (patch) => {
    set(patch);
  },
}));

export function settingsValues(state: SettingsValues): SettingsValues {
  const { language, theme, layout, speedUnit, inputMode, strictMode } = state;
  return { language, theme, layout, speedUnit, inputMode, strictMode };
}

/**
 * Applies settings loaded from storage; unknown or outdated values keep their
 * defaults. Without a saved layout, the layout follows the interface language.
 */
export function restoreSettings(values: Readonly<Record<string, unknown>>): void {
  const patch: Partial<SettingsValues> = {};
  if (isOneOf(LANGUAGES, values.language)) patch.language = values.language;
  if (isOneOf(THEME_PREFERENCES, values.theme)) patch.theme = values.theme;
  if (isOneOf(LAYOUT_IDS, values.layout)) {
    patch.layout = values.layout;
  } else if (patch.language) {
    patch.layout = defaultLayoutFor(patch.language);
  }
  if (isOneOf(SPEED_UNIT_PREFERENCES, values.speedUnit)) patch.speedUnit = values.speedUnit;
  if (isOneOf(INPUT_MODES, values.inputMode)) patch.inputMode = values.inputMode;
  if (typeof values.strictMode === 'boolean') patch.strictMode = values.strictMode;
  useSettings.setState(patch);
}
