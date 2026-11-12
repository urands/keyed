import { create } from 'zustand';

import type { KeyInput } from '../engine/input/toInput';
import { keyForChar, type KeyCode, type LayoutId } from '../engine/layout/layout';
import { stageKeys, startSetKeys, type StageKind } from '../engine/progress/course';
import { courseState, type CourseState } from '../engine/progress/courseState';
import { advanceStage, type StageProgress } from '../engine/progress/progress';
import { createRandom } from '../engine/random';
import {
  createLesson,
  pauseLesson,
  pressKey,
  resumeLesson,
  type LessonState,
} from '../engine/session/lesson';
import { applySamples, isKeyMastered, type KeyStat } from '../engine/stats/keyStats';
import { summarizeLesson, type LessonResult } from '../engine/stats/lessonResult';
import { buildCourseText } from '../engine/textgen/courseText';
import type { LayoutProgress } from '../storage/types';
import { kitFor, PRACTICE_LAYOUTS, type LayoutKit } from './layouts';
import { useMotivation, type LayoutFacts, type LessonOutcome } from './motivation';
import { learningParams, useSettings } from './settings';
import { getStorage, saveInBackground, useStorageStatus } from './storage';

const random = createRandom(crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now());

function kitOf(layoutId: LayoutId): LayoutKit {
  return kitFor(layoutId, { yoLetter: useSettings.getState().yoLetter });
}

function courseOf(
  kit: LayoutKit,
  keyStats: Readonly<Record<string, KeyStat>>,
  opened: Readonly<Record<string, number>>,
): CourseState {
  const { strictMode } = useSettings.getState();
  return courseState(kit.course, opened, keyStats, learningParams(), strictMode, kit.allowance);
}

/** The kind of stage a key belongs to; a key outside the course counts as a letter. */
function kindOf(kit: LayoutKit, key: string): StageKind {
  return kit.course.stages.find((stage) => stageKeys(stage).includes(key))?.kind ?? 'letters';
}

/**
 * A lesson for the current stage. A key chosen for training becomes the focus,
 * and the text is built the way its own stage builds it.
 */
function lessonFor(kit: LayoutKit, course: CourseState, training: string | null): LessonState {
  return createLesson(
    buildCourseText({
      ...kit.content,
      kind: training === null ? course.stage.kind : kindOf(kit, training),
      open: course.open,
      focus: training ?? course.progress.focus,
      random,
      params: learningParams(),
      locale: kit.layout.language,
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
  /** Opened key groups, by stage id. */
  opened: Record<string, number>;
}

interface PracticeState {
  /** The layout being practised; its progress is below. */
  layoutId: LayoutId;
  keyStats: Record<string, KeyStat>;
  /** Opened key groups, by stage id. */
  opened: Record<string, number>;
  /** Where the learner is in the whole course. */
  course: CourseState;
  /** Progress of the current stage (`course.progress`). */
  progress: StageProgress;
  /** A key the learner chose to train on the course screen; null follows the course. */
  training: string | null;
  lesson: LessonState;
  /** Wall-clock time of the lesson's first press, ms. */
  startedAt: number | null;
  result: LessonResult | null;
  /** Keys the last lesson opened. */
  unlocked: readonly string[];
  /** The stage the last lesson completed, if any. */
  stageDone: string | null;
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
  /** Records and achievements of the lesson just finished, for the result screen. */
  outcome: LessonOutcome | null;

  /** Replaces the progress of a layout with what was loaded from storage, and shows it. */
  restore: (layoutId: LayoutId, saved: LayoutProgress) => void;
  /** Keeps the progress of another layout in memory without switching to it. */
  preload: (layoutId: LayoutId, saved: LayoutProgress) => void;
  /** Switches to another layout with its own progress; the current lesson is dropped. */
  switchLayout: (layoutId: LayoutId) => Promise<void>;
  /**
   * Re-evaluates progress after a setting that affects it (strict mode, "ё").
   * With `newLesson`, a lesson not started yet is built again.
   */
  refreshProgress: (newLesson?: boolean) => void;
  /** Trains one open key until `train(null)`; the lesson starts again. */
  train: (key: string | null) => void;
  /** Opens every key of the letters stage at once, for a learner who already types blind. */
  openAllLetters: () => void;
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
  const kit = kitOf(layoutId);
  const course = courseOf(kit, saved.keyStats, saved.opened);
  // A stage whose start keys were never typed begins with their introduction:
  // the first lesson of a learner, or a stage reached before the app was closed.
  // A stage opened in full at once (the first-run "I type blind" level) has no introduction.
  const { stage } = course;
  const fresh =
    stage.kind !== 'free' &&
    (saved.opened[stage.id] ?? 0) === 0 &&
    stage.start.every((key) => !saved.keyStats[key]);
  return {
    layoutId,
    keyStats: saved.keyStats,
    opened: saved.opened,
    course,
    progress: course.progress,
    training: null,
    lesson: lessonFor(kit, course, null),
    startedAt: null,
    result: null,
    unlocked: [],
    stageDone: null,
    introduce: fresh ? stage.start : [],
    feedback: null,
    wrongLayout: false,
    outcome: null,
  };
}

function savedOf(saved: LayoutProgress): SavedProgress {
  return { keyStats: saved.keyStats, opened: saved.opened };
}

export const usePractice = create<PracticeState>()((set, get) => ({
  ...viewOf(useSettings.getState().layout, { keyStats: {}, opened: {} }),
  cache: {},

  restore: (layoutId, saved) => {
    const progress = savedOf(saved);
    set(({ cache }) => ({
      ...viewOf(layoutId, progress),
      cache: { ...cache, [layoutId]: progress },
    }));
  },

  preload: (layoutId, saved) => {
    if (layoutId === get().layoutId) return;
    set(({ cache }) => ({ cache: { ...cache, [layoutId]: savedOf(saved) } }));
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

  refreshProgress: (newLesson = false) => {
    const { layoutId, keyStats, opened, training, lesson } = get();
    const kit = kitOf(layoutId);
    const course = courseOf(kit, keyStats, opened);
    // A key switched off ("ё") cannot be trained any more.
    const stillTraining = training !== null && course.open.has(training) ? training : null;
    set({ course, progress: course.progress, training: stillTraining });
    if (newLesson && lesson.status === 'ready') get().startLesson();
  },

  train: (key) => {
    const { course } = get();
    set({ training: key !== null && course.open.has(key) ? key : null, introduce: [] });
    get().startLesson();
  },

  openAllLetters: () => {
    const { layoutId, keyStats, opened, cache } = get();
    const { letters } = kitOf(layoutId);
    const all = letters.order.length;
    if ((opened[letters.id] ?? 0) >= all) return;
    const progress = { keyStats, opened: { ...opened, [letters.id]: all } };
    saveInBackground(getStorage().saveOpened(layoutId, letters.id, all));
    set({ ...viewOf(layoutId, progress), cache: { ...cache, [layoutId]: progress } });
  },

  startLesson: (text) => {
    set(({ layoutId, course, training }) => ({
      lesson:
        text === undefined ? lessonFor(kitOf(layoutId), course, training) : createLesson(text),
      startedAt: null,
      result: null,
      outcome: null,
      unlocked: [],
      stageDone: null,
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
    const kit = kitOf(layoutId);
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
    const params = learningParams();
    const result = summarizeLesson(next);
    const keyStats = applySamples(state.keyStats, next.chars, params, kit.allowance);
    const strict = useSettings.getState().strictMode;
    const { stage } = state.course;
    const stageOpened = advanceStage(
      stage,
      state.opened[stage.id] ?? 0,
      keyStats,
      params,
      strict,
      kit.allowance,
    );
    const opened = { ...state.opened, [stage.id]: stageOpened };
    const course = courseOf(kit, keyStats, opened);
    // New keys: the next group of the stage, or the start keys of the next stage.
    const unlocked = [...course.open].filter((key) => !state.course.open.has(key));
    const stageDone = course.stageIndex > state.course.stageIndex ? stage.id : null;
    const facts = {
      layoutId,
      startedAt,
      durationMs: result.durationMs,
      length: result.length,
      errors: result.errors,
      cpm: result.cpm,
      accuracy: result.accuracy,
    };
    saveInBackground(
      getStorage().saveLesson(
        { ...facts, stage: stage.id, samples: next.chars },
        keyStats,
        stageOpened,
      ),
    );
    const cache = { ...state.cache, [layoutId]: { keyStats, opened } };
    // The day, the streak, records and achievements.
    const outcome = useMotivation.getState().recordLesson(facts, layoutFactsOf(cache));
    set({
      lesson: next,
      startedAt,
      feedback,
      wrongLayout: false,
      result,
      outcome,
      keyStats,
      opened,
      course,
      progress: course.progress,
      unlocked,
      stageDone,
      introduce: unlocked,
      cache,
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

/**
 * What achievements need about one layout: the letters stage. Mastery here
 * ignores strict mode: once mastered counts.
 */
function factsOf(layoutId: LayoutId, saved: SavedProgress): LayoutFacts {
  const { letters } = kitOf(layoutId);
  const params = learningParams();
  const mastered = (key: string) => isKeyMastered(saved.keyStats[key], params);
  const keys = stageKeys(letters);
  const opened = saved.opened[letters.id] ?? 0;
  const open = letters.start.length + letters.order.slice(0, opened).flat().length;
  return {
    layoutId,
    startMastered: startSetKeys(letters).every(mastered),
    openedShare: open / keys.length,
    complete: opened >= letters.order.length && keys.every(mastered),
  };
}

function layoutFactsOf(cache: Partial<Record<LayoutId, SavedProgress>>): LayoutFacts[] {
  return PRACTICE_LAYOUTS.flatMap((layoutId) => {
    const saved = cache[layoutId];
    return saved ? [factsOf(layoutId, saved)] : [];
  });
}

/** Facts of every layout with progress in memory, the current one included. */
export function layoutFactsFrom(state: {
  cache: Partial<Record<LayoutId, SavedProgress>>;
  layoutId: LayoutId;
  keyStats: Record<string, KeyStat>;
  opened: Record<string, number>;
}): LayoutFacts[] {
  const { cache, layoutId, keyStats, opened } = state;
  return layoutFactsOf({ ...cache, [layoutId]: { keyStats, opened } });
}

export function currentLayoutFacts(): LayoutFacts[] {
  return layoutFactsFrom(usePractice.getState());
}

useSettings.subscribe((state, previous) => {
  // Strict mode and the target speed change which keys count as mastered.
  if (state.strictMode !== previous.strictMode || state.targetCpm !== previous.targetCpm) {
    usePractice.getState().refreshProgress();
  }
  // "ё" changes the Russian course and its words; the length changes the next text.
  if (state.yoLetter !== previous.yoLetter || state.lessonLength !== previous.lessonLength) {
    usePractice.getState().refreshProgress(true);
  }
});

/** The layout, course and content of the layout being practised. */
export function useLayoutKit(): LayoutKit {
  const layoutId = usePractice((s) => s.layoutId);
  const yoLetter = useSettings((s) => s.yoLetter);
  return kitFor(layoutId, { yoLetter });
}
