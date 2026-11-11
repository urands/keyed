/**
 * Learning parameters: the one place for the numbers in docs/learning-method.md
 * ("Параметры по умолчанию"). Change them here, not in the code that uses them.
 */
export const DEFAULT_PARAMS = {
  /** Target speed, characters per minute (35 WPM). */
  targetCpm: 175,
  /** Smoothing of key time and key accuracy. */
  timeAlpha: 0.1,
  accuracyAlpha: 0.1,
  /** Key accuracy that counts as fully accurate. */
  accuracyThreshold: 0.95,
  /** Correct first-try presses needed before a key counts as mastered. */
  minHitsToMaster: 30,
  /** Lesson length, characters. */
  lessonLength: 120,
  /** Share of lesson words that contain the focus key. */
  focusWordShare: 0.5,
  /** Silence after which a lesson pauses, ms. */
  idleMs: 5000,
  /** Daily goal, minutes of typing. */
  dailyGoalMinutes: 10,
} as const;
