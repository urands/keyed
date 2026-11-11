import { addDays, type LocalDate } from './dates';

export interface StreakRules {
  /** A freeze is earned for every this many days of the streak. */
  freezeEvery: number;
  /** Freezes that can be kept at once. */
  maxFreezes: number;
}

export interface StreakState {
  /** Days in a row with the goal met, freezes not counted; today counts once its goal is met. */
  current: number;
  best: number;
  /** Freezes available now. */
  freezes: number;
  /** Missed days that a freeze covered. */
  frozen: LocalDate[];
  /** The last streak ended on a missed day and no new day has been met since. */
  broken: boolean;
}

/**
 * Replays the history day by day (docs/product.md, "Серия дней"): a day with the
 * goal met extends the streak, and every `freezeEvery` days earn a freeze. A
 * missed day spends a freeze automatically; without one the streak ends.
 * Today is never a missed day: it is not over yet.
 */
export function computeStreak(
  goalMetDays: ReadonlySet<LocalDate>,
  today: LocalDate,
  rules: StreakRules,
): StreakState {
  const state: StreakState = { current: 0, best: 0, freezes: 0, frozen: [], broken: false };
  const first = [...goalMetDays].sort()[0];
  if (first === undefined || first > today) return state;

  for (let date = first; date <= today; date = addDays(date, 1)) {
    if (goalMetDays.has(date)) {
      state.current += 1;
      state.best = Math.max(state.best, state.current);
      state.broken = false;
      if (state.current % rules.freezeEvery === 0) {
        state.freezes = Math.min(rules.maxFreezes, state.freezes + 1);
      }
    } else if (date === today) {
      // Today can still be saved.
    } else if (state.current > 0 && state.freezes > 0) {
      state.freezes -= 1;
      state.frozen.push(date);
    } else if (state.current > 0) {
      state.current = 0;
      state.broken = true;
    }
  }
  return state;
}
