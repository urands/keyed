import { create } from 'zustand';

import type { InputMode } from '../engine/input/toInput';
import { GEOMETRY_IDS, type GeometryId } from '../engine/layout/geometry';
import { LAYOUT_IDS, type LayoutId } from '../engine/layout/layout';
import { DEFAULT_PARAMS, type LearningParams } from '../engine/params';
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

/** Target speed choices, characters per minute (docs/learning-method.md, "Параметры"). */
export const TARGET_CPM = { min: 100, max: 400, step: 25 } as const;

/** Lesson length choices, characters. */
export const LESSON_LENGTHS = [60, 120, 200, 300] as const;
export type LessonLength = (typeof LESSON_LENGTHS)[number];

/** Size of the lesson text. */
export const TEXT_SIZES = ['small', 'medium', 'large', 'xlarge'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export interface SettingsValues {
  language: Language;
  theme: ThemePreference;
  /** The layout being learned. */
  layout: LayoutId;
  speedUnit: SpeedUnitPreference;
  inputMode: InputMode;
  /** Physical keyboard: ANSI (long Enter) or ISO (tall Enter, short left Shift). */
  keyboardType: GeometryId;
  /** Only current confidence counts for opening keys (docs/learning-method.md). */
  strictMode: boolean;
  /** The Russian course teaches "ё" and its texts keep it (docs/learning-method.md, "Буква ё"). */
  yoLetter: boolean;
  /** Speed at which a key counts as fast enough, characters per minute. */
  targetCpm: number;
  lessonLength: LessonLength;
  showKeyboard: boolean;
  showHands: boolean;
  textSize: TextSize;
  /** No movement in the interface, whatever the system says. */
  reduceMotion: boolean;
  dailyGoal: DailyGoal;
  remindersEnabled: boolean;
  /** Local time of the reminder, "HH:MM". */
  reminderTime: string;
  soundKeys: boolean;
  soundErrors: boolean;
  /** 0–100. */
  soundVolume: number;
  /** Check GitHub for a new version at startup: the only network request of the app. */
  autoUpdate: boolean;
  /** The first-run wizard is done, or the user had lessons before it existed. */
  onboarded: boolean;
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
  keyboardType: 'ansi',
  strictMode: false,
  yoLetter: false,
  targetCpm: DEFAULT_PARAMS.targetCpm,
  lessonLength: DEFAULT_PARAMS.lessonLength as LessonLength,
  showKeyboard: true,
  showHands: true,
  textSize: 'medium',
  reduceMotion: false,
  dailyGoal: defaultGoal,
  // Reminders and sounds are off until the user turns them on (docs/product.md).
  remindersEnabled: false,
  reminderTime: '19:00',
  soundKeys: false,
  soundErrors: false,
  soundVolume: 50,
  autoUpdate: true,
  onboarded: false,
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
  'keyboardType',
  'strictMode',
  'yoLetter',
  'targetCpm',
  'lessonLength',
  'showKeyboard',
  'showHands',
  'textSize',
  'reduceMotion',
  'dailyGoal',
  'remindersEnabled',
  'reminderTime',
  'soundKeys',
  'soundErrors',
  'soundVolume',
  'autoUpdate',
  'onboarded',
] as const satisfies readonly (keyof SettingsValues)[];

/** Learning parameters with the user's target speed and lesson length. */
export function learningParams(
  values: Pick<SettingsValues, 'targetCpm' | 'lessonLength'> = useSettings.getState(),
): LearningParams {
  return { ...DEFAULT_PARAMS, targetCpm: values.targetCpm, lessonLength: values.lessonLength };
}

export function isTargetCpm(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    value >= TARGET_CPM.min &&
    value <= TARGET_CPM.max &&
    (value - TARGET_CPM.min) % TARGET_CPM.step === 0
  );
}

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
  if (isOneOf(GEOMETRY_IDS, values.keyboardType)) patch.keyboardType = values.keyboardType;
  if (typeof values.strictMode === 'boolean') patch.strictMode = values.strictMode;
  if (typeof values.yoLetter === 'boolean') patch.yoLetter = values.yoLetter;
  if (isTargetCpm(values.targetCpm)) patch.targetCpm = values.targetCpm;
  if ((LESSON_LENGTHS as readonly unknown[]).includes(values.lessonLength)) {
    patch.lessonLength = values.lessonLength as LessonLength;
  }
  if (typeof values.showKeyboard === 'boolean') patch.showKeyboard = values.showKeyboard;
  if (typeof values.showHands === 'boolean') patch.showHands = values.showHands;
  if (isOneOf(TEXT_SIZES, values.textSize)) patch.textSize = values.textSize;
  if (typeof values.reduceMotion === 'boolean') patch.reduceMotion = values.reduceMotion;
  if (typeof values.autoUpdate === 'boolean') patch.autoUpdate = values.autoUpdate;
  if (typeof values.onboarded === 'boolean') patch.onboarded = values.onboarded;
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
