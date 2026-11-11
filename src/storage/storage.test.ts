// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import type { KeyStat } from '../engine/stats/keyStats';
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
