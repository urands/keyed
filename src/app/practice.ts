import { create } from 'zustand';

import { ansiGeometry, englishContent, enUsQwerty, enUsQwertyCourse } from '../content';
import type { KeyInput } from '../engine/input/toInput';
import type { KeyCode } from '../engine/layout/layout';
import { DEFAULT_PARAMS } from '../engine/params';
import type { CourseStage } from '../engine/progress/course';
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
import { getStorage, saveInBackground } from './storage';

// One layout and one keyboard type until phases 3 and 6 add the choice.
export const practiceLayout = enUsQwerty;
export const practiceGeometry = ansiGeometry;

function letterStage(): CourseStage {
  const stage = enUsQwertyCourse.stages.find((s) => s.id === 'letters');
  if (!stage) throw new Error('The English course has no "letters" stage');
  return stage;
}

/** The stage being learned; later stages arrive in phase 5. */
export const practiceStage = letterStage();

const params = DEFAULT_PARAMS;
/** Strict mode becomes a setting with the settings screen (task 6.2). */
const STRICT = false;
const random = createRandom(crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now());

function progressOf(keyStats: Readonly<Record<string, KeyStat>>, opened: number): StageProgress {
  return evaluateStage(practiceStage, opened, keyStats, params, STRICT);
}

function lessonFor(progress: StageProgress): LessonState {
  return createLesson(
    buildLessonText({
      ...englishContent,
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

interface PracticeState {
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

  /** Replaces the progress with what was loaded from storage. */
  restore: (saved: LayoutProgress) => void;
  /** Starts a new lesson with the given text, or with text built for the current progress. */
  startLesson: (text?: string) => void;
  /** Starts the current text again from the beginning. */
  repeatLesson: () => void;
  press: (input: KeyInput) => void;
  pause: () => void;
  resume: () => void;
  dismissIntro: () => void;
}

const initialProgress = progressOf({}, 0);

export const usePractice = create<PracticeState>()((set, get) => ({
  keyStats: {},
  opened: 0,
  progress: initialProgress,
  lesson: lessonFor(initialProgress),
  startedAt: null,
  result: null,
  unlocked: [],
  // A new learner first meets the start keys.
  introduce: practiceStage.start,
  feedback: null,

  restore: (saved) => {
    const opened = saved.opened[practiceStage.id] ?? 0;
    const progress = progressOf(saved.keyStats, opened);
    set({
      keyStats: saved.keyStats,
      opened,
      progress,
      lesson: lessonFor(progress),
      startedAt: null,
      result: null,
      unlocked: [],
      introduce: Object.keys(saved.keyStats).length === 0 ? practiceStage.start : [],
      feedback: null,
    });
  },

  startLesson: (text) => {
    set(({ progress }) => ({
      lesson: text === undefined ? lessonFor(progress) : createLesson(text),
      startedAt: null,
      result: null,
      unlocked: [],
      feedback: null,
    }));
  },

  repeatLesson: () => {
    get().startLesson(get().lesson.text);
  },

  press: (input) => {
    const state = get();
    const { lesson } = state;
    if (lesson.status === 'finished' || lesson.status === 'paused') return;
    const expected = lesson.chars[lesson.position]?.char;
    const next = pressKey(lesson, input.char, input.time);
    const startedAt = state.startedAt ?? Date.now();
    const feedback: KeyFeedback = {
      code: input.code,
      correct: input.char === expected,
      seq: (state.feedback?.seq ?? 0) + 1,
    };

    if (next.status !== 'finished') {
      set({ lesson: next, startedAt, feedback });
      return;
    }

    // The end of a lesson: update key statistics, maybe open the next keys, save.
    const result = summarizeLesson(next);
    const keyStats = applySamples(state.keyStats, next.chars, params);
    const opened = advanceStage(practiceStage, state.opened, keyStats, params, STRICT);
    const unlocked = opened > state.opened ? (practiceStage.order[state.opened] ?? []) : [];
    saveInBackground(
      getStorage().saveLesson(
        {
          layoutId: practiceLayout.id,
          stage: practiceStage.id,
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
      result,
      keyStats,
      opened,
      progress: progressOf(keyStats, opened),
      unlocked,
      introduce: unlocked,
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
