// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import type { KeyStat } from '../engine/stats/keyStats';
import { BackupError, makeBackup, parseBackup } from './backup';
import { createMemoryStorage } from './memory';
import { decodeSamples, encodeSamples } from './samples';
import { createSqliteStorage, type SqlDatabase } from './sqlite';
import type { LessonRecord, Storage } from './types';

/** Binds values to `$1`, `$2`, … by name, as the Tauri plugin does by position. */
function named(values: unknown[]): Record<string, SQLInputValue> {
  return Object.fromEntries(values.map((value, i) => [`$${i + 1}`, value as SQLInputValue]));
}

/** Real SQLite with the app's migration, through Node's built-in driver. */
function nodeSqlite(): SqlDatabase {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync('src-tauri/migrations/0001_init.sql', 'utf8'));
  return {
    execute(sql, values = []) {
      db.prepare(sql).run(named(values));
      return Promise.resolve();
    },
    select<Row>(sql: string, values: unknown[] = []) {
      return Promise.resolve(db.prepare(sql).all(named(values)) as Row[]);
    },
  };
}

function lesson(overrides: Partial<LessonRecord> = {}): LessonRecord {
  return {
    layoutId: 'en-us-qwerty',
    stage: 'letters',
    startedAt: 1_800_000_000_000,
    durationMs: 30_000,
    length: 3,
    errors: 1,
    cpm: 180.5,
    accuracy: 2 / 3,
    samples: [
      { char: 'f', typos: [], time: null },
      { char: 'j', typos: ['k', 'l'], time: null },
      { char: 'f', typos: [], time: 310 },
    ],
    ...overrides,
  };
}

const stats: Record<string, KeyStat> = {
  f: { hits: 2, misses: 0, timeEma: 310, accEma: 1, bestConfidence: 0 },
  j: { hits: 0, misses: 1, timeEma: null, accEma: 0, bestConfidence: 0 },
  // Not in the lesson, so not saved by it.
  d: { hits: 9, misses: 9, timeEma: 999, accEma: 0.5, bestConfidence: 0 },
};

describe.each([
  ['SQLite', () => createSqliteStorage(nodeSqlite())],
  ['memory', () => createMemoryStorage()],
])('%s storage', (_name, create: () => Storage) => {
  it('starts empty', async () => {
    const storage = create();
    expect(await storage.loadSettings()).toEqual({});
    expect(await storage.loadProgress('en-us-qwerty')).toEqual({ keyStats: {}, opened: {} });
    expect(await storage.listLessons('en-us-qwerty', 10)).toEqual([]);
  });

  it('saves and updates settings', async () => {
    const storage = create();
    await storage.saveSettings({ theme: 'dark', language: 'ru' });
    await storage.saveSettings({ theme: 'light', targetCpm: 200 });
    expect(await storage.loadSettings()).toEqual({
      theme: 'light',
      language: 'ru',
      targetCpm: 200,
    });
  });

  it('saves a lesson with the statistics of its keys and the stage progress', async () => {
    const storage = create();
    await storage.saveLesson(lesson(), stats, 2);

    expect(await storage.loadProgress('en-us-qwerty')).toEqual({
      keyStats: { f: stats.f, j: stats.j },
      opened: { letters: 2 },
    });
    expect(await storage.loadProgress('ru-jcuken')).toEqual({ keyStats: {}, opened: {} });
  });

  it('updates key statistics with later lessons', async () => {
    const storage = create();
    await storage.saveLesson(lesson(), stats, 0);
    const better = { ...stats, f: { ...stats.f!, hits: 5, bestConfidence: 0.5 } };
    await storage.saveLesson(lesson({ startedAt: 1_800_000_060_000 }), better, 1);

    const progress = await storage.loadProgress('en-us-qwerty');
    expect(progress.keyStats.f).toEqual(better.f);
    expect(progress.opened).toEqual({ letters: 1 });
  });

  it('lists the latest lessons of a layout, oldest first', async () => {
    const storage = create();
    for (let i = 0; i < 5; i += 1) {
      await storage.saveLesson(
        lesson({ startedAt: 1_800_000_000_000 + i, cpm: 100 + i }),
        stats,
        0,
      );
    }
    await storage.saveLesson(lesson({ layoutId: 'ru-jcuken' }), stats, 0);

    const lessons = await storage.listLessons('en-us-qwerty', 3);
    expect(lessons.map((l) => l.cpm)).toEqual([102, 103, 104]);
    expect(lessons[0]).toMatchObject({
      stage: 'letters',
      durationMs: 30_000,
      length: 3,
      errors: 1,
      accuracy: 2 / 3,
    });
  });

  it('lists the whole history of every layout, oldest first', async () => {
    const storage = create();
    await storage.saveLesson(lesson({ startedAt: 2, cpm: 120 }), stats, 0);
    await storage.saveLesson(lesson({ layoutId: 'ru-jcuken', startedAt: 1, cpm: 90 }), stats, 0);
    expect(await storage.listHistory()).toEqual([
      {
        layoutId: 'ru-jcuken',
        startedAt: 1,
        durationMs: 30_000,
        length: 3,
        errors: 1,
        cpm: 90,
        accuracy: 2 / 3,
      },
      expect.objectContaining({ layoutId: 'en-us-qwerty', cpm: 120 }),
    ]);
  });

  it('saves days and updates them', async () => {
    const storage = create();
    const day = { date: '2026-11-11', activeMs: 60_000, lessons: 1, chars: 120, goalMet: false };
    await storage.saveDay(day);
    await storage.saveDay({ date: '2026-11-10', activeMs: 1, lessons: 1, chars: 1, goalMet: true });
    await storage.saveDay({ ...day, activeMs: 600_000, lessons: 2, goalMet: true });
    expect(await storage.loadDays()).toEqual([
      { date: '2026-11-10', activeMs: 1, lessons: 1, chars: 1, goalMet: true },
      { ...day, activeMs: 600_000, lessons: 2, goalMet: true },
    ]);
  });

  it('saves achievement levels and never lowers them', async () => {
    const storage = create();
    await storage.saveAchievement('speed', { level: 2, unlockedAt: 100 });
    await storage.saveAchievement('speed', { level: 1, unlockedAt: 200 });
    await storage.saveAchievement('first-step', { level: 1, unlockedAt: 50 });
    expect(await storage.loadAchievements()).toEqual({
      speed: { level: 2, unlockedAt: 100 },
      'first-step': { level: 1, unlockedAt: 50 },
    });
    await storage.saveAchievement('speed', { level: 3, unlockedAt: 300 });
    expect((await storage.loadAchievements()).speed).toEqual({ level: 3, unlockedAt: 300 });
  });

  it('saves opened groups without a lesson', async () => {
    const storage = create();
    await storage.saveOpened('ru-jcuken', 'letters', 16);
    await storage.saveOpened('ru-jcuken', 'letters', 17);
    expect(await storage.loadProgress('ru-jcuken')).toEqual({
      keyStats: {},
      opened: { letters: 17 },
    });
  });

  async function fill(storage: Storage): Promise<void> {
    await storage.saveSettings({ theme: 'dark', onboarded: true });
    await storage.saveLesson(lesson({ startedAt: 5 }), stats, 2);
    await storage.saveLesson(
      lesson({ layoutId: 'ru-jcuken', stage: 'capitals', startedAt: 3 }),
      stats,
      1,
    );
    await storage.saveDay({
      date: '2026-11-11',
      activeMs: 60_000,
      lessons: 2,
      chars: 6,
      goalMet: true,
    });
    await storage.saveAchievement('first-step', { level: 1, unlockedAt: 5 });
  }

  it('exports everything, lessons with their keystrokes', async () => {
    const storage = create();
    await fill(storage);
    const data = await storage.exportData();
    expect(data.settings).toEqual({ theme: 'dark', onboarded: true });
    expect(data.lessons.map((l) => [l.layoutId, l.startedAt])).toEqual([
      ['ru-jcuken', 3],
      ['en-us-qwerty', 5],
    ]);
    expect(data.lessons[1]).toEqual(lesson({ startedAt: 5 }));
    expect(data.progress).toEqual({
      'en-us-qwerty': { keyStats: { f: stats.f, j: stats.j }, opened: { letters: 2 } },
      'ru-jcuken': { keyStats: { f: stats.f, j: stats.j }, opened: { capitals: 1 } },
    });
    expect(data.days).toHaveLength(1);
    expect(data.achievements).toEqual({ 'first-step': { level: 1, unlockedAt: 5 } });
  });

  it('imports an export into another storage, replacing what was there', async () => {
    const source = create();
    await fill(source);
    const exported = await source.exportData();

    const target = create();
    await target.saveSettings({ language: 'en' });
    await target.saveLesson(lesson({ cpm: 1 }), stats, 9);
    await target.importData(exported);

    expect(await target.exportData()).toEqual(exported);
    expect(await target.listLessons('en-us-qwerty', 10)).toHaveLength(1);
    expect(await target.listHistory()).toHaveLength(2);
  });

  it('imports many lessons', async () => {
    const source = create();
    for (let i = 0; i < 120; i += 1) await source.saveLesson(lesson({ startedAt: i }), stats, 1);
    const target = create();
    await target.importData(await source.exportData());
    expect(await target.listHistory()).toHaveLength(120);
  });

  it('resets progress but keeps the settings', async () => {
    const storage = create();
    await fill(storage);
    await storage.resetProgress();
    expect(await storage.exportData()).toEqual({
      settings: { theme: 'dark', onboarded: true },
      lessons: [],
      progress: {},
      days: [],
      achievements: {},
    });
  });
});

describe('backup file', () => {
  it('survives writing and reading', async () => {
    const storage = createMemoryStorage();
    await storage.saveLesson(lesson(), stats, 2);
    await storage.saveDay({
      date: '2026-11-11',
      activeMs: 1,
      lessons: 1,
      chars: 3,
      goalMet: false,
    });
    const backup = makeBackup(await storage.exportData(), 42);
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup);
  });

  it('tells what is wrong with a file it cannot read', () => {
    const reason = (json: string) => {
      try {
        parseBackup(json);
        return null;
      } catch (error) {
        return error instanceof BackupError ? error.reason : 'other';
      }
    };
    const valid = makeBackup(
      { settings: {}, lessons: [], progress: {}, days: [], achievements: {} },
      0,
    );
    expect(reason(JSON.stringify(valid))).toBeNull();
    expect(reason('{oops')).toBe('notBackup');
    expect(reason('{"format":"other"}')).toBe('notBackup');
    expect(reason(JSON.stringify({ ...valid, version: 2 }))).toBe('newerVersion');
    expect(reason(JSON.stringify({ ...valid, lessons: [{ layoutId: 'dvorak' }] }))).toBe('damaged');
    expect(
      reason(
        JSON.stringify({
          ...valid,
          progress: { 'en-us-qwerty': { keyStats: { a: 1 }, opened: {} } },
        }),
      ),
    ).toBe('damaged');
    expect(reason(JSON.stringify({ ...valid, days: [{ date: 'today' }] }))).toBe('damaged');
  });
});

describe('memory storage persistence', () => {
  it('restores what it saved', async () => {
    let saved: string | null = null;
    const persistence = { load: () => saved, save: (data: string) => (saved = data) };
    await createMemoryStorage(persistence).saveLesson(lesson(), stats, 1);

    const restored = createMemoryStorage(persistence);
    expect((await restored.loadProgress('en-us-qwerty')).opened).toEqual({ letters: 1 });
  });

  it('starts empty when the saved copy is damaged', async () => {
    const storage = createMemoryStorage({ load: () => '{not json', save: () => undefined });
    expect(await storage.loadSettings()).toEqual({});
  });
});

describe('samples', () => {
  it('survive encoding', () => {
    const samples = lesson().samples;
    expect(decodeSamples(encodeSamples(samples))).toEqual(samples);
  });
});
