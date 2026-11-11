import { create } from 'zustand';

import type { KeyInput } from '../engine/input/toInput';
import { keyForChar, type KeyCode, type LayoutId } from '../engine/layout/layout';
import { DEFAULT_PARAMS } from '../engine/params';
import { advanceStage, evaluateStage, type StageProgress } from '../engine/progress/progress';
import { createRandom } from '../engine/random';
import {
  createLesson,
  pauseLesson,
  pressKey,
  resumeLesson,
  type LessonState,
} from '../engine/session/lesson';
import { applySamples, type KeyStat } from '../engine/stats/keyStats';
import { summarizeLesson, type LessonResult } from '../engine/stats/lessonResult';
import { buildLessonText } from '../engine/textgen/lessonText';
import type { LayoutProgress } from '../storage/types';
import { kitFor, type LayoutKit } from './layouts';
import { useSettings } from './settings';
import { getStorage, saveInBackground, useStorageStatus } from './storage';

const params = DEFAULT_PARAMS;
const random = createRandom(crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now());

function progressOf(
  kit: LayoutKit,
  keyStats: Readonly<Record<string, KeyStat>>,
  opened: number,
): StageProgress {
  return evaluateStage(kit.stage, opened, keyStats, params, useSettings.getState().strictMode);
}

function lessonFor(kit: LayoutKit, progress: StageProgress): LessonState {
  return createLesson(
    buildLessonText({
      ...kit.content,
      letters: new Set(progress.open),
      focus: progress.focus,
      random,
      params,
    }),
  );
}

/** The last typed key, for the flash on the virtual keyboard. */
export interface KeyFeedback {
  code: KeyCode;
  correct: boolean;
  /** Grows with every press, so pressing the same key again flashes again. */
  seq: number;
}

/** Learning progress of one layout as the store keeps it. */
interface SavedProgress {
  keyStats: Record<string, KeyStat>;
  opened: number;
}

interface PracticeState {
  /** The layout being practised; its progress is below. */
  layoutId: LayoutId;
  keyStats: Record<string, KeyStat>;
  /** Opened key groups of the stage. */
  opened: number;
  progress: StageProgress;
  lesson: LessonState;
  /** Wall-clock time of the lesson's first press, ms. */
  startedAt: number | null;
  result: LessonResult | null;
  /** Keys the last lesson opened. */
  unlocked: readonly string[];
  /** Keys to introduce with a card before the next lesson. */
  introduce: readonly string[];
  feedback: KeyFeedback | null;
  /**
   * The last press typed a character the lesson layout does not have, so the
   * system keyboard layout is probably wrong. Not counted as a mistake.
   */
  wrongLayout: boolean;
  /** Progress of the other layouts used in this session, so switching back is instant. */
  cache: Partial<Record<LayoutId, SavedProgress>>;

  /** Replaces the progress of a layout with what was loaded from storage, and shows it. */
  restore: (layoutId: LayoutId, saved: LayoutProgress) => void;
  /** Switches to another layout with its own progress; the current lesson is dropped. */
  switchLayout: (layoutId: LayoutId) => Promise<void>;
  /** Re-evaluates progress after a setting that affects it (strict mode). */
  refreshProgress: () => void;
  /** Starts a new lesson with the given text, or with text built for the current progress. */
  startLesson: (text?: string) => void;
  /** Starts the current text again from the beginning. */
  repeatLesson: () => void;
  press: (input: KeyInput) => void;
  pause: () => void;
  resume: () => void;
  dismissIntro: () => void;
}

/** A clean view of a layout's progress, with a new lesson. */
function viewOf(layoutId: LayoutId, saved: SavedProgress) {
  const kit = kitFor(layoutId);
  const progress = progressOf(kit, saved.keyStats, saved.opened);
  const isNew = Object.keys(saved.keyStats).length === 0;
  return {
    layoutId,
    keyStats: saved.keyStats,
    opened: saved.opened,
    progress,
    lesson: lessonFor(kit, progress),
    startedAt: null,
    result: null,
    unlocked: [],
    // A learner new to this layout first meets its start keys.
    introduce: isNew ? kit.stage.start : [],
    feedback: null,
    wrongLayout: false,
  };
}

export const usePractice = create<PracticeState>()((set, get) => ({
  ...viewOf(useSettings.getState().layout, { keyStats: {}, opened: 0 }),
  cache: {},

  restore: (layoutId, saved) => {
    const progress: SavedProgress = {
      keyStats: saved.keyStats,
      opened: saved.opened[kitFor(layoutId).stage.id] ?? 0,
    };
    set(({ cache }) => ({
      ...viewOf(layoutId, progress),
      cache: { ...cache, [layoutId]: progress },
    }));
  },

  switchLayout: async (layoutId) => {
    const state = get();
    if (layoutId === state.layoutId) return;
    useSettings.getState().update({ layout: layoutId });
    const cache = {
      ...state.cache,
      [state.layoutId]: { keyStats: state.keyStats, opened: state.opened },
    };
    const cached = cache[layoutId];
    if (cached) {
      set({ ...viewOf(layoutId, cached), cache });
      return;
    }
    set({ cache });
    let saved: LayoutProgress = { keyStats: {}, opened: {} };
    try {
      saved = await getStorage().loadProgress(layoutId);
    } catch (error) {
      console.error('Could not load layout progress.', error);
      useStorageStatus.getState().markFailed();
    }
    // The user may have switched again while this was loading.
    if (useSettings.getState().layout === layoutId) get().restore(layoutId, saved);
  },

  refreshProgress: () => {
    set(({ layoutId, keyStats, opened }) => ({
      progress: progressOf(kitFor(layoutId), keyStats, opened),
    }));
  },

  startLesson: (text) => {
    set(({ layoutId, progress }) => ({
      lesson: text === undefined ? lessonFor(kitFor(layoutId), progress) : createLesson(text),
      startedAt: null,
      result: null,
      unlocked: [],
      feedback: null,
      wrongLayout: false,
    }));
  },

  repeatLesson: () => {
    get().startLesson(get().lesson.text);
  },

  press: (input) => {
    const state = get();
    const { lesson, layoutId } = state;
    if (lesson.status === 'finished' || lesson.status === 'paused') return;
    const kit = kitFor(layoutId);
    // In system layout mode a character from another layout means the wrong
    // system layout is on. That is a hint, not a typing mistake.
    if (keyForChar(kit.layout, input.char) === null) {
      if (!state.wrongLayout) set({ wrongLayout: true });
      return;
    }

    const expected = lesson.chars[lesson.position]?.char;
    const next = pressKey(lesson, input.char, input.time);
    const startedAt = state.startedAt ?? Date.now();
    const feedback: KeyFeedback = {
      code: input.code,
      correct: input.char === expected,
      seq: (state.feedback?.seq ?? 0) + 1,
    };

    if (next.status !== 'finished') {
      set({ lesson: next, startedAt, feedback, wrongLayout: false });
      return;
    }

    // The end of a lesson: update key statistics, maybe open the next keys, save.
    const result = summarizeLesson(next);
    const keyStats = applySamples(state.keyStats, next.chars, params);
    const strict = useSettings.getState().strictMode;
    const opened = advanceStage(kit.stage, state.opened, keyStats, params, strict);
    const unlocked = opened > state.opened ? (kit.stage.order[state.opened] ?? []) : [];
    saveInBackground(
      getStorage().saveLesson(
        {
          layoutId,
          stage: kit.stage.id,
          startedAt,
          durationMs: result.durationMs,
          length: result.length,
          errors: result.errors,
          cpm: result.cpm,
          accuracy: result.accuracy,
          samples: next.chars,
        },
        keyStats,
        opened,
      ),
    );
    set({
      lesson: next,
      startedAt,
      feedback,
      wrongLayout: false,
      result,
      keyStats,
      opened,
      progress: progressOf(kit, keyStats, opened),
      unlocked,
      introduce: unlocked,
      cache: { ...state.cache, [layoutId]: { keyStats, opened } },
    });
  },

  pause: () => {
    const { lesson } = get();
    const paused = pauseLesson(lesson);
    if (paused !== lesson) set({ lesson: paused });
  },

  resume: () => {
    const { lesson } = get();
    const resumed = resumeLesson(lesson);
    if (resumed !== lesson) set({ lesson: resumed });
  },

  dismissIntro: () => {
    set({ introduce: [] });
  },
}));

// Strict mode changes which keys count as mastered.
useSettings.subscribe((state, previous) => {
  if (state.strictMode !== previous.strictMode) usePractice.getState().refreshProgress();
});

/** The layout, course stage and content of the layout being practised. */
export function useLayoutKit(): LayoutKit {
  return kitFor(usePractice((s) => s.layoutId));
}
