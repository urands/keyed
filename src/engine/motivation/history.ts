import type { LayoutId } from '../layout/layout';
import { addDays, localDate, type LocalDate } from './dates';
import type { DayRecord } from './daily';

/** What is known about a saved lesson without its keystrokes. */
export interface LessonFacts {
  layoutId: LayoutId;
  /** Ms since 1970. */
  startedAt: number;
  durationMs: number;
  length: number;
  errors: number;
  cpm: number;
  accuracy: number;
}

export interface LayoutRecords {
  lessons: number;
  bestCpm: number;
  bestAccuracy: number;
}

/** Totals over all lessons, kept up to date one lesson at a time. */
export interface HistoryTotals {
  lessons: number;
  chars: number;
  activeMs: number;
  bestCpm: number;
  /** Lessons without a single mistake. */
  perfectLessons: number;
  /** Lessons in a row with accuracy at or above the steady threshold. */
  accurateRun: number;
  bestAccurateRun: number;
  byLayout: Partial<Record<LayoutId, LayoutRecords>>;
}

export const EMPTY_TOTALS: Readonly<HistoryTotals> = {
  lessons: 0,
  chars: 0,
  activeMs: 0,
  bestCpm: 0,
  perfectLessons: 0,
  accurateRun: 0,
  bestAccurateRun: 0,
  byLayout: {},
};

export function addToTotals(
  totals: Readonly<HistoryTotals>,
  lesson: LessonFacts,
  steadyAccuracy: number,
): HistoryTotals {
  const accurateRun = lesson.accuracy >= steadyAccuracy ? totals.accurateRun + 1 : 0;
  const layout = totals.byLayout[lesson.layoutId] ?? { lessons: 0, bestCpm: 0, bestAccuracy: 0 };
  return {
    lessons: totals.lessons + 1,
    chars: totals.chars + lesson.length,
    activeMs: totals.activeMs + lesson.durationMs,
    bestCpm: Math.max(totals.bestCpm, lesson.cpm),
    perfectLessons: totals.perfectLessons + (lesson.errors === 0 ? 1 : 0),
    accurateRun,
    bestAccurateRun: Math.max(totals.bestAccurateRun, accurateRun),
    byLayout: {
      ...totals.byLayout,
      [lesson.layoutId]: {
        lessons: layout.lessons + 1,
        bestCpm: Math.max(layout.bestCpm, lesson.cpm),
        bestAccuracy: Math.max(layout.bestAccuracy, lesson.accuracy),
      },
    },
  };
}

export interface PeriodStats {
  lessons: number;
  /** Average lesson speed; null without lessons. */
  cpm: number | null;
  accuracy: number | null;
  activeMs: number;
}

function periodStats(lessons: readonly LessonFacts[]): PeriodStats {
  if (lessons.length === 0) return { lessons: 0, cpm: null, accuracy: null, activeMs: 0 };
  const sum = (pick: (l: LessonFacts) => number) => lessons.reduce((s, l) => s + pick(l), 0);
  return {
    lessons: lessons.length,
    cpm: sum((l) => l.cpm) / lessons.length,
    accuracy: sum((l) => l.accuracy) / lessons.length,
    activeMs: sum((l) => l.durationMs),
  };
}

/**
 * This week against the week before (docs/product.md, "Личные рекорды"): the
 * last seven days including today, and the seven days before them.
 */
export function weekComparison(
  lessons: readonly LessonFacts[],
  today: LocalDate,
): { current: PeriodStats; previous: PeriodStats } {
  const weekStart = addDays(today, -6);
  const previousStart = addDays(today, -13);
  const inRange = (from: LocalDate, to: LocalDate) =>
    lessons.filter((lesson) => {
      const date = localDate(lesson.startedAt);
      return date >= from && date <= to;
    });
  return {
    current: periodStats(inRange(weekStart, today)),
    previous: periodStats(inRange(previousStart, addDays(weekStart, -1))),
  };
}

/** The day with the most typing time; null without practice. */
export function mostProductiveDay(days: readonly DayRecord[]): DayRecord | null {
  return days.reduce<DayRecord | null>(
    (best, day) => (day.activeMs > (best?.activeMs ?? 0) ? day : best),
    null,
  );
}
