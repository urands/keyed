import { beforeEach, describe, expect, it, vi } from 'vitest';

import { localDate } from '../engine/motivation/dates';
import type { LessonFacts } from '../engine/motivation/history';
import { streakOf, useMotivation, type LayoutFacts } from './motivation';
import { useSettings } from './settings';
import { getStorage, openStorage } from './storage';

const MIN = 60_000;
const at = (day: number, hour = 12) => new Date(2026, 10, day, hour).getTime();
const noLayouts: LayoutFacts[] = [];

function lesson(overrides: Partial<LessonFacts> = {}): LessonFacts {
  return {
    layoutId: 'en-us-qwerty',
    startedAt: at(11),
    durationMs: 4 * MIN,
    length: 600,
    errors: 3,
    cpm: 150,
    accuracy: 0.98,
    ...overrides,
  };
}

beforeEach(async () => {
  localStorage.clear();
  await openStorage();
  useSettings.setState({ dailyGoal: 10 });
  useMotivation.getState().restore({ days: [], history: [], achievements: {} });
  vi.useFakeTimers({ now: at(11, 20), toFake: ['Date'] });
  return () => {
    vi.useRealTimers();
  };
});

describe('recording lessons', () => {
  it('adds typing time to the day of the lesson and marks the goal', async () => {
    const record = useMotivation.getState().recordLesson;
    record(lesson(), noLayouts);
    record(lesson(), noLayouts);
    expect(useMotivation.getState().days['2026-11-11']).toMatchObject({
      activeMs: 8 * MIN,
      lessons: 2,
      goalMet: false,
    });

    record(lesson(), noLayouts);
    const day = useMotivation.getState().days['2026-11-11'];
    expect(day).toMatchObject({ activeMs: 12 * MIN, lessons: 3, chars: 1800, goalMet: true });
    await vi.waitFor(async () => {
      expect(await getStorage().loadDays()).toEqual([day]);
    });
  });

  it('counts a streak across days and keeps today open', () => {
    const record = useMotivation.getState().recordLesson;
    for (const day of [8, 9, 10])
      record(lesson({ startedAt: at(day), durationMs: 10 * MIN }), noLayouts);

    const { days } = useMotivation.getState();
    expect(streakOf(days, 10 * MIN, '2026-11-10')).toMatchObject({ current: 3 });
    // The next day, before any practice, the streak is still 3.
    expect(streakOf(days, 10 * MIN, '2026-11-11')).toMatchObject({ current: 3, broken: false });
    // A day later with the 11th missed and no freeze, it has ended.
    expect(streakOf(days, 10 * MIN, '2026-11-12')).toMatchObject({ current: 0, best: 3 });
  });

  it('awards an achievement once, with a plaque', () => {
    const record = useMotivation.getState().recordLesson;
    const first = record(lesson(), noLayouts);
    expect(first.unlocks).toEqual(expect.arrayContaining([{ id: 'first-step', level: 1 }]));
    expect(useMotivation.getState().toasts.map((t) => t.id)).toContain('first-step');

    const second = record(lesson(), noLayouts);
    expect(second.unlocks.map((u) => u.id)).not.toContain('first-step');
    expect(useMotivation.getState().achievements['first-step']?.level).toBe(1);
  });

  it('awards speed levels as the best speed grows', () => {
    const record = useMotivation.getState().recordLesson;
    expect(record(lesson({ cpm: 160 }), noLayouts).unlocks).toContainEqual({
      id: 'speed',
      level: 2,
    });
    expect(record(lesson({ cpm: 120 }), noLayouts).unlocks.map((u) => u.id)).not.toContain('speed');
    expect(record(lesson({ cpm: 205 }), noLayouts).unlocks).toContainEqual({
      id: 'speed',
      level: 3,
    });
  });

  it('awards progress achievements from layout facts', () => {
    const facts: LayoutFacts[] = [
      { layoutId: 'en-us-qwerty', startMastered: true, openedShare: 0.6, complete: false },
      { layoutId: 'ru-jcuken', startMastered: true, openedShare: 0.2, complete: false },
    ];
    const ids = useMotivation
      .getState()
      .recordLesson(lesson(), facts)
      .unlocks.map((u) => u.id);
    expect(ids).toEqual(expect.arrayContaining(['home-row', 'halfway', 'two-layouts']));
    expect(ids).not.toContain('alphabet');
  });

  it('marks a personal record and compares with the average of earlier lessons', () => {
    const record = useMotivation.getState().recordLesson;
    expect(record(lesson({ cpm: 150 }), noLayouts)).toMatchObject({
      record: false,
      previousAverageCpm: null,
    });
    record(lesson({ cpm: 170 }), noLayouts);
    expect(record(lesson({ cpm: 200 }), noLayouts)).toMatchObject({
      record: true,
      previousAverageCpm: 160,
    });
    expect(record(lesson({ cpm: 190 }), noLayouts).record).toBe(false);
  });

  it('awards silently what saved progress already earned', () => {
    useMotivation.getState().restore({ days: [], history: [lesson()], achievements: {} });
    useMotivation.getState().awardSilently(noLayouts);
    expect(useMotivation.getState().achievements['first-step']?.level).toBe(1);
    expect(useMotivation.getState().toasts).toEqual([]);
  });

  it('uses the local day of the lesson start', () => {
    useMotivation.getState().recordLesson(lesson({ startedAt: at(11, 23) }), noLayouts);
    expect(Object.keys(useMotivation.getState().days)).toEqual([localDate(at(11, 23))]);
  });
});
