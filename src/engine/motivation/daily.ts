import type { LocalDate } from './dates';

/** Practice of one day (docs/product.md, "Дневная цель"). */
export interface DayRecord {
  date: LocalDate;
  /** Typing time without pauses, ms. */
  activeMs: number;
  lessons: number;
  /** Characters typed. */
  chars: number;
  /** The daily goal was reached that day. Once set, it stays set even if the goal grows later. */
  goalMet: boolean;
}

export function emptyDay(date: LocalDate): DayRecord {
  return { date, activeMs: 0, lessons: 0, chars: 0, goalMet: false };
}

/** Adds a finished lesson to its day. Only typing time counts toward the goal. */
export function addLessonToDay(
  day: DayRecord | undefined,
  date: LocalDate,
  lesson: { durationMs: number; length: number },
  goalMs: number,
): DayRecord {
  const base = day ?? emptyDay(date);
  const activeMs = base.activeMs + lesson.durationMs;
  return {
    ...base,
    activeMs,
    lessons: base.lessons + 1,
    chars: base.chars + lesson.length,
    goalMet: base.goalMet || activeMs >= goalMs,
  };
}

/**
 * Whether the day counts for the streak. Today is judged by the current goal,
 * so lowering the goal completes a day that already has enough practice.
 */
export function dayGoalMet(day: DayRecord, goalMs: number, today: LocalDate): boolean {
  return day.goalMet || (day.date === today && day.activeMs >= goalMs);
}
