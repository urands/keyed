import { create } from 'zustand';

import { ansiGeometry, commonEnglishWords, enUsQwerty } from '../content';
import type { KeyInput } from '../engine/input/toInput';
import type { KeyCode } from '../engine/layout/layout';
import { DEFAULT_PARAMS } from '../engine/params';
import { createRandom } from '../engine/random';
import {
  createLesson,
  pauseLesson,
  pressKey,
  resumeLesson,
  type LessonState,
} from '../engine/session/lesson';
import { summarizeLesson, type LessonResult } from '../engine/stats/lessonResult';
import { buildWordLesson } from '../engine/textgen/wordLesson';

// Phase 1 has one layout and one keyboard type; settings for them come in phases 3 and 6.
export const practiceLayout = enUsQwerty;
export const practiceGeometry = ansiGeometry;

/** Keys in use. Phase 1 has no course yet, so these are all letters and the space bar. */
export const practiceKeys: ReadonlySet<KeyCode> = new Set(
  Object.entries(practiceLayout.keys)
    .filter(([code, { base }]) => code === 'Space' || /^\p{L}$/u.test(base))
    .map(([code]) => code),
);

const random = createRandom(crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now());

function generateText(): string {
  return buildWordLesson(commonEnglishWords, random, DEFAULT_PARAMS.lessonLength);
}

/** The last typed key, for the flash on the virtual keyboard. */
export interface KeyFeedback {
  code: KeyCode;
  correct: boolean;
  /** Grows with every press, so pressing the same key again flashes again. */
  seq: number;
}

interface PracticeState {
  lesson: LessonState;
  result: LessonResult | null;
  feedback: KeyFeedback | null;
  /** Starts a new lesson with the given text, or with new random text. */
  startLesson: (text?: string) => void;
  /** Starts the current text again from the beginning. */
  repeatLesson: () => void;
  press: (input: KeyInput) => void;
  pause: () => void;
  resume: () => void;
}

export const usePractice = create<PracticeState>()((set, get) => ({
  lesson: createLesson(generateText()),
  result: null,
  feedback: null,

  startLesson: (text = generateText()) => {
    set({ lesson: createLesson(text), result: null, feedback: null });
  },

  repeatLesson: () => {
    get().startLesson(get().lesson.text);
  },

  press: (input) => {
    const { lesson, feedback } = get();
    if (lesson.status === 'finished' || lesson.status === 'paused') return;
    const expected = lesson.chars[lesson.position]?.char;
    const next = pressKey(lesson, input.char, input.time);
    set({
      lesson: next,
      result: next.status === 'finished' ? summarizeLesson(next) : null,
      feedback: {
        code: input.code,
        correct: input.char === expected,
        seq: (feedback?.seq ?? 0) + 1,
      },
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
}));
