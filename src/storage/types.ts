import type { LayoutId } from '../engine/layout/layout';
import type { UnlockedAchievement } from '../engine/motivation/achievements';
import type { DayRecord } from '../engine/motivation/daily';
import type { LessonFacts } from '../engine/motivation/history';
import type { KeySample, KeyStat } from '../engine/stats/keyStats';

/** A finished lesson as it is saved. */
export interface LessonRecord {
  layoutId: LayoutId;
  stage: string;
  /** Ms since 1970. */
  startedAt: number;
  durationMs: number;
  length: number;
  errors: number;
  cpm: number;
  accuracy: number;
  /** Every typed position, in order; key statistics can be rebuilt from these. */
  samples: readonly KeySample[];
}

/** A saved lesson without its samples, for history and charts. */
export type LessonSummary = Omit<LessonRecord, 'samples' | 'layoutId'> & { id: number };

/** Learning progress of one layout. */
export interface LayoutProgress {
  keyStats: Record<string, KeyStat>;
  /** Opened key groups per course stage. */
  opened: Record<string, number>;
}

/**
 * Where the app keeps its data (docs/architecture.md, "Хранилище"). Version 1
 * stores everything in SQLite on the computer; a web version will add another
 * implementation of the same interface.
 */
export interface Storage {
  loadSettings(): Promise<Record<string, unknown>>;
  /** Saves the given settings; settings not listed stay as they are. */
  saveSettings(values: Readonly<Record<string, unknown>>): Promise<void>;
  loadProgress(layoutId: LayoutId): Promise<LayoutProgress>;
  /**
   * Saves a finished lesson together with what it changed: the statistics of
   * the keys it contains and the number of opened groups of its stage.
   */
  saveLesson(
    lesson: LessonRecord,
    keyStats: Readonly<Record<string, KeyStat>>,
    opened: number,
  ): Promise<void>;
  /** The latest lessons of a layout, oldest first. */
  listLessons(layoutId: LayoutId, limit: number): Promise<LessonSummary[]>;
  /** Every lesson of every layout without keystrokes, oldest first: for totals and records. */
  listHistory(): Promise<LessonFacts[]>;
  /** Practice per day, oldest first. */
  loadDays(): Promise<DayRecord[]>;
  saveDay(day: DayRecord): Promise<void>;
  loadAchievements(): Promise<Record<string, UnlockedAchievement>>;
  saveAchievement(id: string, achievement: UnlockedAchievement): Promise<void>;
}

/** Keys whose statistics a lesson changed. */
export function lessonKeys(lesson: LessonRecord): string[] {
  return [...new Set(lesson.samples.map((sample) => sample.char))];
}
