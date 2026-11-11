import { create } from 'zustand';

import type { InputMode } from '../engine/input/toInput';
import { LAYOUT_IDS, type LayoutId } from '../engine/layout/layout';
import { DEFAULT_PARAMS } from '../engine/params';
import { isOneOf } from '../engine/validate';
import { detectLanguage, LANGUAGES, type Language } from '../i18n';
import { THEME_PREFERENCES, type ThemePreference } from '../ui/theme/theme';

export const SPEED_UNIT_PREFERENCES = ['auto', 'wpm', 'cpm'] as const;
/** `auto` shows characters per minute for Russian and words per minute for English. */
export type SpeedUnitPreference = (typeof SPEED_UNIT_PREFERENCES)[number];

export const INPUT_MODES: readonly InputMode[] = ['emulate', 'system'];

/** Daily goal choices, minutes of typing (docs/product.md, "Дневная цель"). */
export const DAILY_GOALS = [5, 10, 15, 20, 30] as const;
export type DailyGoal = (typeof DAILY_GOALS)[number];

export interface SettingsValues {
  language: Language;
  theme: ThemePreference;
  /** The layout being learned. */
  layout: LayoutId;
  speedUnit: SpeedUnitPreference;
  inputMode: InputMode;
  /** Only current confidence counts for opening keys (docs/learning-method.md). */
  strictMode: boolean;
  dailyGoal: DailyGoal;
  remindersEnabled: boolean;
  /** Local time of the reminder, "HH:MM". */
  reminderTime: string;
  soundKeys: boolean;
  soundErrors: boolean;
  /** 0–100. */
  soundVolume: number;
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
const defaultGoal = DEFAULT_PARAMS.dailyGoalMinutes as DailyGoal;

export const useSettings = create<SettingsState>()((set) => ({
  language,
  theme: 'system',
  layout: defaultLayoutFor(language),
  speedUnit: 'auto',
  inputMode: 'emulate',
  strictMode: false,
  dailyGoal: defaultGoal,
  // Reminders and sounds are off until the user turns them on (docs/product.md).
  remindersEnabled: false,
  reminderTime: '19:00',
  soundKeys: false,
  soundErrors: false,
  soundVolume: 50,
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

const SETTING_KEYS = [
  'language',
  'theme',
  'layout',
  'speedUnit',
  'inputMode',
  'strictMode',
  'dailyGoal',
  'remindersEnabled',
  'reminderTime',
  'soundKeys',
  'soundErrors',
  'soundVolume',
] as const satisfies readonly (keyof SettingsValues)[];

export function settingsValues(state: SettingsValues): SettingsValues {
  return Object.fromEntries(
    SETTING_KEYS.map((key) => [key, state[key]]),
  ) as unknown as SettingsValues;
}

/** The daily goal in ms of typing. */
export function dailyGoalMs(goal: DailyGoal): number {
  return goal * 60_000;
}

const isTime = (value: unknown): value is string =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

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
  if ((DAILY_GOALS as readonly unknown[]).includes(values.dailyGoal)) {
    patch.dailyGoal = values.dailyGoal as DailyGoal;
  }
  if (typeof values.remindersEnabled === 'boolean')
    patch.remindersEnabled = values.remindersEnabled;
  if (isTime(values.reminderTime)) patch.reminderTime = values.reminderTime;
  if (typeof values.soundKeys === 'boolean') patch.soundKeys = values.soundKeys;
  if (typeof values.soundErrors === 'boolean') patch.soundErrors = values.soundErrors;
  if (
    typeof values.soundVolume === 'number' &&
    values.soundVolume >= 0 &&
    values.soundVolume <= 100
  ) {
    patch.soundVolume = values.soundVolume;
  }
  useSettings.setState(patch);
}
