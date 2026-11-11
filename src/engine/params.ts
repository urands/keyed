/**
 * Learning parameters: the one place for the numbers in docs/learning-method.md
 * ("Параметры по умолчанию"). Change them here, not in the code that uses them.
 */
export interface LearningParams {
  /** Target speed, characters per minute. */
  targetCpm: number;
  /** Smoothing of key time and key accuracy (α). */
  timeAlpha: number;
  accuracyAlpha: number;
  /** Key accuracy that counts as fully accurate. */
  accuracyThreshold: number;
  /** Correct first-try presses needed before a key counts as mastered. */
  minHitsToMaster: number;
  /** Lesson length, characters. */
  lessonLength: number;
  /** Minimum share of lesson words that contain the focus key. */
  focusWordShare: number;
  /** Below this many real words with the focus key, pseudo-words are added. */
  minFocusWords: number;
  /** Length of dictionary words used in lessons. */
  wordMinLength: number;
  wordMaxLength: number;
  /** Length of pseudo-words. */
  pseudoMinLength: number;
  pseudoMaxLength: number;
  /** Silence after which a lesson pauses, ms. */
  idleMs: number;
  /** Daily goal, minutes of typing. */
  dailyGoalMinutes: number;
}

export const DEFAULT_PARAMS: Readonly<LearningParams> = {
  targetCpm: 175,
  timeAlpha: 0.1,
  accuracyAlpha: 0.1,
  accuracyThreshold: 0.95,
  minHitsToMaster: 30,
  lessonLength: 120,
  focusWordShare: 0.5,
  minFocusWords: 20,
  wordMinLength: 2,
  wordMaxLength: 8,
  pseudoMinLength: 3,
  pseudoMaxLength: 7,
  idleMs: 5000,
  dailyGoalMinutes: 10,
};
