import { create } from 'zustand';

import { achievementDefs } from '../content';
import type { LayoutId } from '../engine/layout/layout';
import {
  newUnlocks,
  type AchievementMetrics,
  type AchievementUnlock,
  type UnlockedAchievement,
} from '../engine/motivation/achievements';
import { addLessonToDay, dayGoalMet, type DayRecord } from '../engine/motivation/daily';
import { localDate, type LocalDate } from '../engine/motivation/dates';
import {
  addToTotals,
  EMPTY_TOTALS,
  type HistoryTotals,
  type LessonFacts,
} from '../engine/motivation/history';
import { computeStreak, type StreakState } from '../engine/motivation/streak';
import { DEFAULT_PARAMS } from '../engine/params';
import { dailyGoalMs, useSettings } from './settings';
import { getStorage, saveInBackground } from './storage';

const STREAK_RULES = {
  freezeEvery: DEFAULT_PARAMS.freezeEvery,
  maxFreezes: DEFAULT_PARAMS.maxFreezes,
};
/** The result screen compares a lesson with the average of this many previous ones. */
const RECENT_LESSONS = 10;

/** What achievements need to know about the progress of one layout. */
export interface LayoutFacts {
  layoutId: LayoutId;
  /** Every key of the starting set (introductory lessons) is mastered. */
  startMastered: boolean;
  /** Share of the stage's keys that are open, 0–1. */
  openedShare: number;
  /** Every key is open and mastered. */
  complete: boolean;
}

/** Extra facts for the result screen of the lesson just finished. */
export interface LessonOutcome {
  /** The lesson beat the best speed of its layout (and there was one to beat). */
  record: boolean;
  /** Average speed of the previous lessons of this layout; null without them. */
  previousAverageCpm: number | null;
  unlocks: AchievementUnlock[];
}

interface MotivationState {
  days: Record<LocalDate, DayRecord>;
  /** Every lesson without keystrokes, oldest first. */
  history: LessonFacts[];
  totals: HistoryTotals;
  achievements: Record<string, UnlockedAchievement>;
  /** Achievements waiting to be shown as plaques. */
  toasts: AchievementUnlock[];

  restore: (data: {
    days: readonly DayRecord[];
    history: readonly LessonFacts[];
    achievements: Record<string, UnlockedAchievement>;
  }) => void;
  /** Adds a finished lesson: day, totals, records, achievements. Saves in the background. */
  recordLesson: (lesson: LessonFacts, layouts: readonly LayoutFacts[]) => LessonOutcome;
  /**
   * Awards achievements already earned by saved progress, without plaques.
   * Used at start, so progress from before achievements existed counts too.
   */
  awardSilently: (layouts: readonly LayoutFacts[]) => void;
  dismissToast: (id: string) => void;
}

/** The streak as of `today`, with today judged by the current goal. */
export function streakOf(
  days: Readonly<Record<LocalDate, DayRecord>>,
  goalMs: number,
  today: LocalDate,
): StreakState {
  const met = new Set(
    Object.values(days)
      .filter((day) => dayGoalMet(day, goalMs, today))
      .map((day) => day.date),
  );
  return computeStreak(met, today, STREAK_RULES);
}

export function achievementMetrics(
  totals: HistoryTotals,
  bestStreak: number,
  layouts: readonly LayoutFacts[],
): AchievementMetrics {
  return {
    lessons: totals.lessons,
    startMasteredLayouts: layouts.filter((l) => l.startMastered).length,
    openedShare: Math.max(0, ...layouts.map((l) => l.openedShare)),
    masteredLayouts: layouts.filter((l) => l.complete).length,
    bestCpm: totals.bestCpm,
    perfectLessons: totals.perfectLessons,
    bestAccurateRun: totals.bestAccurateRun,
    bestStreak,
    activeHours: totals.activeMs / 3_600_000,
    chars: totals.chars,
  };
}

function goalMs(): number {
  return dailyGoalMs(useSettings.getState().dailyGoal);
}

export const useMotivation = create<MotivationState>()((set, get) => {
  /** Stores newly reached levels and returns them. */
  const award = (layouts: readonly LayoutFacts[]): AchievementUnlock[] => {
    const { days, totals, achievements } = get();
    const streak = streakOf(days, goalMs(), localDate(Date.now()));
    const unlocks = newUnlocks(
      achievementDefs,
      achievementMetrics(totals, streak.best, layouts),
      achievements,
    );
    if (unlocks.length === 0) return [];
    const now = Date.now();
    const next = { ...achievements };
    for (const { id, level } of unlocks) {
      next[id] = { level, unlockedAt: now };
      saveInBackground(getStorage().saveAchievement(id, next[id]));
    }
    set({ achievements: next });
    return unlocks;
  };

  return {
    days: {},
    history: [],
    totals: EMPTY_TOTALS,
    achievements: {},
    toasts: [],

    restore: ({ days, history, achievements }) => {
      set({
        days: Object.fromEntries(days.map((day) => [day.date, day])),
        history: [...history],
        totals: history.reduce(
          (totals, lesson) => addToTotals(totals, lesson, DEFAULT_PARAMS.steadyAccuracy),
          EMPTY_TOTALS,
        ),
        achievements,
        toasts: [],
      });
    },

    recordLesson: (lesson, layouts) => {
      const { days, history, totals } = get();
      const previous = history.filter((l) => l.layoutId === lesson.layoutId);
      const recent = previous.slice(-RECENT_LESSONS);
      const bestBefore = totals.byLayout[lesson.layoutId]?.bestCpm ?? 0;

      const date = localDate(lesson.startedAt);
      const day = addLessonToDay(days[date], date, lesson, goalMs());
      saveInBackground(getStorage().saveDay(day));
      set({
        days: { ...days, [date]: day },
        history: [...history, lesson],
        totals: addToTotals(totals, lesson, DEFAULT_PARAMS.steadyAccuracy),
      });

      const unlocks = award(layouts);
      if (unlocks.length > 0) set(({ toasts }) => ({ toasts: [...toasts, ...unlocks] }));
      return {
        record: previous.length > 0 && lesson.cpm > bestBefore,
        previousAverageCpm:
          recent.length === 0 ? null : recent.reduce((s, l) => s + l.cpm, 0) / recent.length,
        unlocks,
      };
    },

    awardSilently: (layouts) => {
      award(layouts);
    },

    dismissToast: (id) => {
      set(({ toasts }) => ({ toasts: toasts.filter((toast) => toast.id !== id) }));
    },
  };
});
