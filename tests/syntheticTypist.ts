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
  /**
   * Extra time and error chance of a capital: the Shift press. It is one more
   * skill learned like a key; the letter itself is already known.
   */
  shiftMs: number;
  shiftErrorFloor: number;
  shiftErrorStart: number;
}

export const STEADY_LEARNER: TypistProfile = {
  fastestMs: 250,
  slowStart: 1.5,
  errorFloor: 0.02,
  errorStart: 0.15,
  learnPresses: 60,
  shiftMs: 60,
  shiftErrorFloor: 0.005,
  shiftErrorStart: 0.05,
};

/** Practice counter of the Shift skill. */
const SHIFT = '⇧';

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
      const learned = (skill: string) =>
        Math.exp(-(practice.get(skill) ?? 0) / profile.learnPresses);
      const practise = (skill: string) => practice.set(skill, (practice.get(skill) ?? 0) + 1);

      for (const char of text) {
        // A capital is its letter plus Shift: the letter's skill carries over.
        const key = char.toLowerCase();
        const capital = key !== char;
        const letter = learned(key);
        const shift = learned(SHIFT);
        let errorChance = profile.errorFloor + (profile.errorStart - profile.errorFloor) * letter;
        let time = profile.fastestMs * (1 + profile.slowStart * letter);
        if (capital) {
          errorChance +=
            profile.shiftErrorFloor + (profile.shiftErrorStart - profile.shiftErrorFloor) * shift;
          time += profile.shiftMs * (1 + profile.slowStart * shift);
        }
        time *= 0.85 + random() * 0.3;
        if (random() < errorChance) {
          clock += time;
          lesson = pressKey(lesson, char === 'x' ? 'z' : 'x', clock);
        }
        clock += time;
        lesson = pressKey(lesson, char, clock);
        practise(key);
        if (capital) practise(SHIFT);
      }
      return lesson;
    },
  };
}
