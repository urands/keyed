import { describe, expect, it } from 'vitest';

import { DEFAULT_PARAMS } from '../params';
import type { LessonResult } from '../stats/lessonResult';
import {
  achievementProgress,
  newUnlocks,
  parseAchievements,
  type AchievementMetrics,
} from './achievements';
import { addDays, daysBetween, localDate, weekday } from './dates';
import { addLessonToDay, dayGoalMet, emptyDay } from './daily';
import {
  addToTotals,
  EMPTY_TOTALS,
  mostProductiveDay,
  weekComparison,
  type LessonFacts,
} from './history';
import { lessonInsight } from './insight';
import { computeStreak } from './streak';

const rules = { freezeEvery: DEFAULT_PARAMS.freezeEvery, maxFreezes: DEFAULT_PARAMS.maxFreezes };
const MIN = 60_000;

/** Dates from `start` for each mark in `pattern`: "x" = goal met, "." = missed. */
function days(start: string, pattern: string): { met: Set<string>; last: string } {
  const met = new Set<string>();
  let date = start;
  [...pattern].forEach((mark, i) => {
    date = addDays(start, i);
    if (mark === 'x') met.add(date);
  });
  return { met, last: date };
}

describe('dates', () => {
  it('formats the local day of a moment', () => {
    expect(localDate(new Date(2026, 10, 11, 23, 59).getTime())).toBe('2026-11-11');
    expect(localDate(new Date(2026, 10, 12, 0, 1).getTime())).toBe('2026-11-12');
  });

  it('adds days across months, years and daylight saving changes', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
  });

  it('counts days between dates and finds the weekday', () => {
    expect(daysBetween('2026-11-01', '2026-11-11')).toBe(10);
    expect(daysBetween('2026-11-11', '2026-11-01')).toBe(-10);
    expect(weekday('2026-11-09')).toBe(0); // Monday
    expect(weekday('2026-11-15')).toBe(6); // Sunday
  });
});

describe('daily goal', () => {
  const goal = 10 * MIN;

  it('adds typing time and marks the goal once it is reached', () => {
    let day = addLessonToDay(undefined, '2026-11-11', { durationMs: 6 * MIN, length: 600 }, goal);
    expect(day).toEqual({
      date: '2026-11-11',
      activeMs: 6 * MIN,
      lessons: 1,
      chars: 600,
      goalMet: false,
    });
    day = addLessonToDay(day, '2026-11-11', { durationMs: 4 * MIN, length: 400 }, goal);
    expect(day.goalMet).toBe(true);
  });

  it('keeps a past day met when the goal grows later', () => {
    const day = { ...emptyDay('2026-11-10'), activeMs: 10 * MIN, goalMet: true };
    expect(dayGoalMet(day, 30 * MIN, '2026-11-11')).toBe(true);
  });

  it('judges today by the current goal', () => {
    const today = { ...emptyDay('2026-11-11'), activeMs: 6 * MIN };
    expect(dayGoalMet(today, 10 * MIN, '2026-11-11')).toBe(false);
    expect(dayGoalMet(today, 5 * MIN, '2026-11-11')).toBe(true);
    expect(dayGoalMet({ ...today, date: '2026-11-10' }, 5 * MIN, '2026-11-11')).toBe(false);
  });
});

describe('streak', () => {
  it('is zero without practice', () => {
    expect(computeStreak(new Set(), '2026-11-11', rules)).toMatchObject({ current: 0, best: 0 });
  });

  it('counts days in a row and keeps today open', () => {
    const { met } = days('2026-11-01', 'xxx');
    expect(computeStreak(met, '2026-11-03', rules)).toMatchObject({ current: 3, best: 3 });
    // Today without the goal yet does not break the streak.
    expect(computeStreak(met, '2026-11-04', rules)).toMatchObject({ current: 3, broken: false });
  });

  it('ends on a missed day without a freeze, and remembers the best streak', () => {
    const { met, last } = days('2026-11-01', 'xxxx.xx');
    expect(computeStreak(met, last, rules)).toMatchObject({ current: 2, best: 4, broken: false });

    const missed = days('2026-11-01', 'xxx.');
    expect(computeStreak(missed.met, addDays(missed.last, 1), rules)).toMatchObject({
      current: 0,
      best: 3,
      broken: true,
    });
  });

  it('earns a freeze every 7 days, at most 2', () => {
    expect(computeStreak(days('2026-11-01', 'x'.repeat(7)).met, '2026-11-07', rules).freezes).toBe(
      1,
    );
    expect(computeStreak(days('2026-11-01', 'x'.repeat(14)).met, '2026-11-14', rules).freezes).toBe(
      2,
    );
    expect(computeStreak(days('2026-11-01', 'x'.repeat(21)).met, '2026-11-21', rules).freezes).toBe(
      2,
    );
  });

  it('spends a freeze on a missed day automatically and keeps the streak', () => {
    const { met, last } = days('2026-11-01', 'xxxxxxx.xx');
    const streak = computeStreak(met, last, rules);
    expect(streak).toMatchObject({ current: 9, freezes: 0, broken: false });
    expect(streak.frozen).toEqual(['2026-11-08']);
  });

  it('ends the streak when the missed days outnumber the freezes', () => {
    const { met, last } = days('2026-11-01', `${'x'.repeat(14)}...x`);
    const streak = computeStreak(met, last, rules);
    expect(streak.frozen).toEqual(['2026-11-15', '2026-11-16']);
    expect(streak).toMatchObject({ current: 1, best: 14, freezes: 0 });
  });

  it('spends freezes while the app was closed, up to today', () => {
    const { met } = days('2026-11-01', 'x'.repeat(7));
    // Two days later: yesterday was missed and covered; today is still open.
    const streak = computeStreak(met, '2026-11-09', rules);
    expect(streak).toMatchObject({ current: 7, freezes: 0, frozen: ['2026-11-08'] });
  });
});

describe('history totals', () => {
  const lesson = (overrides: Partial<LessonFacts>): LessonFacts => ({
    layoutId: 'en-us-qwerty',
    startedAt: new Date(2026, 10, 11, 12).getTime(),
    durationMs: MIN,
    length: 120,
    errors: 2,
    cpm: 150,
    accuracy: 0.98,
    ...overrides,
  });
  const add = (lessons: Partial<LessonFacts>[]) =>
    lessons.reduce(
      (totals, l) => addToTotals(totals, lesson(l), DEFAULT_PARAMS.steadyAccuracy),
      EMPTY_TOTALS,
    );

  it('sums lessons and keeps records per layout', () => {
    const totals = add([
      { cpm: 150 },
      { cpm: 210, errors: 0 },
      { layoutId: 'ru-jcuken', cpm: 250 },
    ]);
    expect(totals).toMatchObject({ lessons: 3, chars: 360, activeMs: 3 * MIN, bestCpm: 250 });
    expect(totals.perfectLessons).toBe(1);
    expect(totals.byLayout['en-us-qwerty']).toEqual({
      lessons: 2,
      bestCpm: 210,
      bestAccuracy: 0.98,
    });
  });

  it('tracks the run of accurate lessons', () => {
    const totals = add([{}, {}, {}, { accuracy: 0.9 }, {}, {}]);
    expect(totals.accurateRun).toBe(2);
    expect(totals.bestAccurateRun).toBe(3);
  });

  it('compares the last seven days with the seven before', () => {
    const at = (day: number) => new Date(2026, 10, day, 12).getTime();
    const lessons = [
      lesson({ startedAt: at(1), cpm: 100, durationMs: 5 * MIN }), // 11 days ago: previous week
      lesson({ startedAt: at(4), cpm: 120, durationMs: 5 * MIN }), // 7 days ago: previous week
      lesson({ startedAt: at(5), cpm: 160, accuracy: 0.9 }), // 6 days ago: this week
      lesson({ startedAt: at(11), cpm: 200, accuracy: 1 }), // today
    ];
    const { current, previous } = weekComparison(lessons, '2026-11-11');
    expect(current).toEqual({ lessons: 2, cpm: 180, accuracy: 0.95, activeMs: 2 * MIN });
    expect(previous).toMatchObject({ lessons: 2, cpm: 110, activeMs: 10 * MIN });
    expect(weekComparison([], '2026-11-11').current).toEqual({
      lessons: 0,
      cpm: null,
      accuracy: null,
      activeMs: 0,
    });
  });

  it('finds the most productive day', () => {
    const a = { ...emptyDay('2026-11-01'), activeMs: 5 * MIN };
    const b = { ...emptyDay('2026-11-02'), activeMs: 25 * MIN };
    expect(mostProductiveDay([a, b])).toBe(b);
    expect(mostProductiveDay([])).toBeNull();
  });
});

describe('achievements', () => {
  const defs = parseAchievements([
    { id: 'first-step', metric: 'lessons', levels: [1] },
    { id: 'speed', metric: 'bestCpm', levels: [100, 150, 200] },
  ]);
  const metrics = (values: Partial<AchievementMetrics>): AchievementMetrics => ({
    lessons: 0,
    startMasteredLayouts: 0,
    openedShare: 0,
    masteredLayouts: 0,
    bestCpm: 0,
    perfectLessons: 0,
    bestAccurateRun: 0,
    bestStreak: 0,
    activeHours: 0,
    chars: 0,
    ...values,
  });

  it('rejects malformed definitions', () => {
    expect(() => parseAchievements([{ id: 'a', metric: 'nope', levels: [1] }])).toThrow(/metric/);
    expect(() => parseAchievements([{ id: 'a', metric: 'lessons', levels: [2, 1] }])).toThrow(
      /ascending/,
    );
    expect(() =>
      parseAchievements([
        { id: 'a', metric: 'lessons', levels: [1] },
        { id: 'a', metric: 'chars', levels: [1] },
      ]),
    ).toThrow(/unique/);
  });

  it('unlocks every level reached and not stored yet', () => {
    expect(newUnlocks(defs, metrics({ lessons: 1, bestCpm: 160 }), {})).toEqual([
      { id: 'first-step', level: 1 },
      { id: 'speed', level: 2 },
    ]);
  });

  it('awards each level once and never takes one back', () => {
    const unlocked = {
      'first-step': { level: 1, unlockedAt: 1 },
      speed: { level: 2, unlockedAt: 2 },
    };
    expect(newUnlocks(defs, metrics({ lessons: 5, bestCpm: 160 }), unlocked)).toEqual([]);
    expect(newUnlocks(defs, metrics({ lessons: 5, bestCpm: 90 }), unlocked)).toEqual([]);
    expect(newUnlocks(defs, metrics({ lessons: 5, bestCpm: 210 }), unlocked)).toEqual([
      { id: 'speed', level: 3 },
    ]);
  });

  it('reports progress toward the next level', () => {
    const [first, speed] = achievementProgress(defs, metrics({ bestCpm: 120 }), {
      speed: { level: 1, unlockedAt: 5 },
    });
    expect(first).toMatchObject({ level: 0, value: 0, next: 1, unlockedAt: null });
    expect(speed).toMatchObject({ level: 1, value: 120, next: 150, unlockedAt: 5 });
  });
});

describe('lesson insight', () => {
  const key = (overrides: Partial<LessonResult['keys'][string]>) => ({
    hits: 5,
    misses: 0,
    timeSum: 1500,
    timeCount: 5,
    typos: {},
    ...overrides,
  });
  const result = (keys: LessonResult['keys']): LessonResult => ({
    length: 30,
    durationMs: 10_000,
    errors: 0,
    accuracy: 1,
    cpm: 180,
    wpm: 36,
    keys,
  });

  it('points at a repeated confusion first', () => {
    const insight = lessonInsight(
      result({ б: key({ misses: 3, typos: { ю: 2, ь: 1 } }), а: key({ timeSum: 9000 }) }),
    );
    expect(insight).toEqual({ kind: 'confusion', expected: 'б', typed: 'ю', count: 2 });
  });

  it('otherwise names the slowest letter', () => {
    const insight = lessonInsight(
      result({ a: key({}), s: key({ timeSum: 3000 }), ' ': key({ timeSum: 9000 }) }),
    );
    expect(insight).toEqual({ kind: 'slowest', key: 's', cpm: 100 });
  });

  it('says nothing without enough data', () => {
    expect(lessonInsight(result({ a: key({ timeCount: 2 }) }))).toBeNull();
  });
});
