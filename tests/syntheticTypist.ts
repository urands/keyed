import type { Random } from '../src/engine/random';
import { createLesson, pressKey, type LessonState } from '../src/engine/session/lesson';

/**
 * A simulated learner for testing the course (docs/architecture.md, "Тестирование").
 * Each key starts slow and error-prone and gets faster and more accurate with
 * practice, approaching `fastestMs` and `errorFloor`.
 */
export interface TypistProfile {
  /** Press time a key settles at, ms. */
  fastestMs: number;
  /** How much slower a brand-new key is: time = fastest × (1 + slowStart × e^(−n / learnPresses)). */
  slowStart: number;
  /** Error chance a key settles at. */
  errorFloor: number;
  /** Error chance of a brand-new key. */
  errorStart: number;
  /** Presses it takes to learn a key (the e-folding count). */
  learnPresses: number;
}

export const STEADY_LEARNER: TypistProfile = {
  fastestMs: 250,
  slowStart: 1.5,
  errorFloor: 0.02,
  errorStart: 0.15,
  learnPresses: 60,
};

export interface SyntheticTypist {
  /** Types the whole text and returns the finished lesson. */
  type(text: string): LessonState;
}

export function createTypist(profile: TypistProfile, random: Random): SyntheticTypist {
  const practice = new Map<string, number>();
  let clock = 0;

  return {
    type(text) {
      let lesson = createLesson(text);
      for (const char of text) {
        const presses = practice.get(char) ?? 0;
        const learned = Math.exp(-presses / profile.learnPresses);
        const errorChance =
          profile.errorFloor + (profile.errorStart - profile.errorFloor) * learned;
        const time =
          profile.fastestMs * (1 + profile.slowStart * learned) * (0.85 + random() * 0.3);
        if (random() < errorChance) {
          clock += time;
          lesson = pressKey(lesson, char === 'x' ? 'z' : 'x', clock);
        }
        clock += time;
        lesson = pressKey(lesson, char, clock);
        practice.set(char, presses + 1);
      }
      return lesson;
    },
  };
}
