import { useEffect, useMemo, useState } from 'react';

import { streakOf, useMotivation } from '../../app/motivation';
import { dailyGoalMs, useSettings } from '../../app/settings';
import { dayGoalMet } from '../../engine/motivation/daily';
import { localDate, type LocalDate } from '../../engine/motivation/dates';
import type { StreakState } from '../../engine/motivation/streak';

/** Today's date; changes at midnight while the app stays open. */
export function useToday(): LocalDate {
  const [today, setToday] = useState(() => localDate(Date.now()));
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    const timer = window.setTimeout(
      () => {
        setToday(localDate(Date.now()));
      },
      midnight - now.getTime() + 1000,
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [today]);
  return today;
}

export interface DailyProgress {
  activeMs: number;
  goalMs: number;
  met: boolean;
}

/** Typing time today against the daily goal; `extraMs` adds a lesson in progress. */
export function useDailyProgress(extraMs = 0): DailyProgress {
  const today = useToday();
  const day = useMotivation((s) => s.days[today]);
  const goalMs = dailyGoalMs(useSettings((s) => s.dailyGoal));
  const activeMs = (day?.activeMs ?? 0) + extraMs;
  return {
    activeMs,
    goalMs,
    met: (day ? dayGoalMet(day, goalMs, today) : false) || activeMs >= goalMs,
  };
}

export function useStreak(): StreakState {
  const today = useToday();
  const days = useMotivation((s) => s.days);
  const goal = useSettings((s) => s.dailyGoal);
  return useMemo(() => streakOf(days, dailyGoalMs(goal), today), [days, goal, today]);
}
