import { LAYOUT_IDS, type LayoutId } from '../engine/layout/layout';
import type { DayRecord } from '../engine/motivation/daily';
import type { LessonFacts } from '../engine/motivation/history';
import type { KeyStat } from '../engine/stats/keyStats';
import { isOneOf } from '../engine/validate';
import { decodeSamples, encodeSamples } from './samples';
import {
  lessonKeys,
  type LessonRecord,
  type LessonSummary,
  type Storage,
  type StoredData,
} from './types';

/** The part of `@tauri-apps/plugin-sql` this storage uses; tests pass a Node SQLite database. */
export interface SqlDatabase {
  execute(sql: string, values?: unknown[]): Promise<unknown>;
  select<Row>(sql: string, values?: unknown[]): Promise<Row[]>;
}

/** Version 1 has one profile; see the migration. */
const PROFILE = 1;

interface KeyStatRow {
  key: string;
  hits: number;
  misses: number;
  time_ema: number | null;
  acc_ema: number | null;
  best_confidence: number;
}

interface DayRow {
  date: string;
  active_ms: number;
  lessons: number;
  chars: number;
  goal_met: number;
}

interface LessonRow {
  id: number;
  stage: string;
  started_at: number;
  duration_ms: number;
  length: number;
  errors: number;
  cpm: number;
  accuracy: number;
}

/**
 * Storage in SQLite. The plugin runs each statement on its own, so a lesson is
 * not saved in one transaction: the lesson row goes first, and the key
 * statistics can be rebuilt from saved lessons if a later write fails.
 */
export function createSqliteStorage(db: SqlDatabase): Storage {
  return {
    async loadSettings() {
      const rows = await db.select<{ key: string; value: string }>(
        'SELECT key, value FROM settings WHERE profile_id = $1',
        [PROFILE],
      );
      const settings: Record<string, unknown> = {};
      for (const { key, value } of rows) {
        try {
          settings[key] = JSON.parse(value);
        } catch {
          // A damaged value falls back to the default.
        }
      }
      return settings;
    },

    async saveSettings(values) {
      for (const [key, value] of Object.entries(values)) {
        await db.execute(
          `INSERT INTO settings (profile_id, key, value) VALUES ($1, $2, $3)
           ON CONFLICT (profile_id, key) DO UPDATE SET value = excluded.value`,
          [PROFILE, key, JSON.stringify(value)],
        );
      }
    },

    async loadProgress(layoutId: LayoutId) {
      const statRows = await db.select<KeyStatRow>(
        `SELECT key, hits, misses, time_ema, acc_ema, best_confidence
         FROM key_stat WHERE profile_id = $1 AND layout_id = $2`,
        [PROFILE, layoutId],
      );
      const progressRows = await db.select<{ stage: string; opened: number }>(
        'SELECT stage, opened FROM course_progress WHERE profile_id = $1 AND layout_id = $2',
        [PROFILE, layoutId],
      );
      const keyStats: Record<string, KeyStat> = {};
      for (const row of statRows) {
        keyStats[row.key] = {
          hits: row.hits,
          misses: row.misses,
          timeEma: row.time_ema,
          accEma: row.acc_ema,
          bestConfidence: row.best_confidence,
        };
      }
      const opened = Object.fromEntries(progressRows.map((row) => [row.stage, row.opened]));
      return { keyStats, opened };
    },

    async saveLesson(lesson, keyStats, opened) {
      const now = Date.now();
      await db.execute(
        `INSERT INTO lesson (profile_id, layout_id, stage, started_at, duration_ms, length,
           errors, cpm, accuracy, samples_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          PROFILE,
          lesson.layoutId,
          lesson.stage,
          Math.round(lesson.startedAt),
          Math.round(lesson.durationMs),
          lesson.length,
          lesson.errors,
          lesson.cpm,
          lesson.accuracy,
          encodeSamples(lesson.samples),
        ],
      );
      for (const key of lessonKeys(lesson)) {
        const stat = keyStats[key];
        if (!stat) continue;
        await db.execute(
          `INSERT INTO key_stat (profile_id, layout_id, key, hits, misses, time_ema, acc_ema,
             best_confidence, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (profile_id, layout_id, key) DO UPDATE SET
             hits = excluded.hits, misses = excluded.misses, time_ema = excluded.time_ema,
             acc_ema = excluded.acc_ema, best_confidence = excluded.best_confidence,
             updated_at = excluded.updated_at`,
          [
            PROFILE,
            lesson.layoutId,
            key,
            stat.hits,
            stat.misses,
            stat.timeEma,
            stat.accEma,
            stat.bestConfidence,
            now,
          ],
        );
      }
      await db.execute(
        `INSERT INTO course_progress (profile_id, layout_id, stage, opened, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (profile_id, layout_id, stage) DO UPDATE SET
           opened = excluded.opened, updated_at = excluded.updated_at`,
        [PROFILE, lesson.layoutId, lesson.stage, opened, now],
      );
    },

    async saveOpened(layoutId, stage, opened) {
      await db.execute(
        `INSERT INTO course_progress (profile_id, layout_id, stage, opened, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (profile_id, layout_id, stage) DO UPDATE SET
           opened = excluded.opened, updated_at = excluded.updated_at`,
        [PROFILE, layoutId, stage, opened, Date.now()],
      );
    },

    async listLessons(layoutId, limit) {
      const rows = await db.select<LessonRow>(
        `SELECT id, stage, started_at, duration_ms, length, errors, cpm, accuracy
         FROM lesson WHERE profile_id = $1 AND layout_id = $2
         ORDER BY started_at DESC, id DESC LIMIT $3`,
        [PROFILE, layoutId, limit],
      );
      return rows.reverse().map((row): LessonSummary => ({
        id: row.id,
        stage: row.stage,
        startedAt: row.started_at,
        durationMs: row.duration_ms,
        length: row.length,
        errors: row.errors,
        cpm: row.cpm,
        accuracy: row.accuracy,
      }));
    },

    async listHistory() {
      const rows = await db.select<LessonRow & { layout_id: string }>(
        `SELECT id, layout_id, stage, started_at, duration_ms, length, errors, cpm, accuracy
         FROM lesson WHERE profile_id = $1 ORDER BY started_at, id`,
        [PROFILE],
      );
      return rows.flatMap((row): LessonFacts[] =>
        isOneOf(LAYOUT_IDS, row.layout_id)
          ? [
              {
                layoutId: row.layout_id,
                startedAt: row.started_at,
                durationMs: row.duration_ms,
                length: row.length,
                errors: row.errors,
                cpm: row.cpm,
                accuracy: row.accuracy,
              },
            ]
          : [],
      );
    },

    async loadDays() {
      const rows = await db.select<DayRow>(
        `SELECT date, active_ms, lessons, chars, goal_met FROM daily
         WHERE profile_id = $1 ORDER BY date`,
        [PROFILE],
      );
      return rows.map((row): DayRecord => ({
        date: row.date,
        activeMs: row.active_ms,
        lessons: row.lessons,
        chars: row.chars,
        goalMet: row.goal_met !== 0,
      }));
    },

    async saveDay(day) {
      // freeze_used stays 0: freezes are worked out from the days themselves.
      await db.execute(
        `INSERT INTO daily (profile_id, date, active_ms, lessons, chars, goal_met, freeze_used)
         VALUES ($1, $2, $3, $4, $5, $6, 0)
         ON CONFLICT (profile_id, date) DO UPDATE SET
           active_ms = excluded.active_ms, lessons = excluded.lessons,
           chars = excluded.chars, goal_met = excluded.goal_met`,
        [PROFILE, day.date, Math.round(day.activeMs), day.lessons, day.chars, day.goalMet ? 1 : 0],
      );
    },

    async loadAchievements() {
      const rows = await db.select<{ id: string; level: number; unlocked_at: number }>(
        'SELECT id, level, unlocked_at FROM achievement WHERE profile_id = $1',
        [PROFILE],
      );
      return Object.fromEntries(
        rows.map((row) => [row.id, { level: row.level, unlockedAt: row.unlocked_at }]),
      );
    },

    async saveAchievement(id, achievement) {
      // A level never goes down, even if two writes race.
      await db.execute(
        `INSERT INTO achievement (profile_id, id, level, unlocked_at) VALUES ($1, $2, $3, $4)
         ON CONFLICT (profile_id, id) DO UPDATE SET
           level = excluded.level, unlocked_at = excluded.unlocked_at
         WHERE excluded.level > achievement.level`,
        [PROFILE, id, achievement.level, Math.round(achievement.unlockedAt)],
      );
    },

    async exportData() {
      const lessonRows = await db.select<LessonRow & { layout_id: string; samples_json: string }>(
        `SELECT id, layout_id, stage, started_at, duration_ms, length, errors, cpm, accuracy,
           samples_json
         FROM lesson WHERE profile_id = $1 ORDER BY started_at, id`,
        [PROFILE],
      );
      const lessons = lessonRows.flatMap((row): LessonRecord[] =>
        isOneOf(LAYOUT_IDS, row.layout_id)
          ? [
              {
                layoutId: row.layout_id,
                stage: row.stage,
                startedAt: row.started_at,
                durationMs: row.duration_ms,
                length: row.length,
                errors: row.errors,
                cpm: row.cpm,
                accuracy: row.accuracy,
                samples: decodeSamples(row.samples_json),
              },
            ]
          : [],
      );
      const progress: StoredData['progress'] = {};
      for (const layoutId of LAYOUT_IDS) {
        const saved = await this.loadProgress(layoutId);
        if (Object.keys(saved.keyStats).length > 0 || Object.keys(saved.opened).length > 0) {
          progress[layoutId] = saved;
        }
      }
      return {
        settings: await this.loadSettings(),
        lessons,
        progress,
        days: await this.loadDays(),
        achievements: await this.loadAchievements(),
      };
    },

    async importData(data) {
      await clear(db, [...PROGRESS_TABLES, 'settings']);
      await this.saveSettings(data.settings);
      const now = Date.now();
      await insertRows(
        db,
        `lesson (profile_id, layout_id, stage, started_at, duration_ms, length, errors, cpm,
           accuracy, samples_json)`,
        data.lessons.map((lesson) => [
          PROFILE,
          lesson.layoutId,
          lesson.stage,
          Math.round(lesson.startedAt),
          Math.round(lesson.durationMs),
          lesson.length,
          lesson.errors,
          lesson.cpm,
          lesson.accuracy,
          encodeSamples(lesson.samples),
        ]),
      );
      for (const [layoutId, { keyStats, opened }] of Object.entries(data.progress)) {
        await insertRows(
          db,
          `key_stat (profile_id, layout_id, key, hits, misses, time_ema, acc_ema,
             best_confidence, updated_at)`,
          Object.entries(keyStats).map(([key, stat]) => [
            PROFILE,
            layoutId,
            key,
            stat.hits,
            stat.misses,
            stat.timeEma,
            stat.accEma,
            stat.bestConfidence,
            now,
          ]),
        );
        await insertRows(
          db,
          'course_progress (profile_id, layout_id, stage, opened, updated_at)',
          Object.entries(opened).map(([stage, count]) => [PROFILE, layoutId, stage, count, now]),
        );
      }
      await insertRows(
        db,
        'daily (profile_id, date, active_ms, lessons, chars, goal_met, freeze_used)',
        data.days.map((day) => [
          PROFILE,
          day.date,
          Math.round(day.activeMs),
          day.lessons,
          day.chars,
          day.goalMet ? 1 : 0,
          0,
        ]),
      );
      await insertRows(
        db,
        'achievement (profile_id, id, level, unlocked_at)',
        Object.entries(data.achievements).map(([id, achievement]) => [
          PROFILE,
          id,
          achievement.level,
          Math.round(achievement.unlockedAt),
        ]),
      );
    },

    async resetProgress() {
      await clear(db, PROGRESS_TABLES);
    },
  };
}

/** Tables with learning progress; `settings` is kept by a reset. */
const PROGRESS_TABLES = ['lesson', 'key_stat', 'course_progress', 'daily', 'achievement'];

async function clear(db: SqlDatabase, tables: readonly string[]): Promise<void> {
  for (const table of tables) {
    await db.execute(`DELETE FROM ${table} WHERE profile_id = $1`, [PROFILE]);
  }
}

/** Rows per INSERT: the plugin sends every statement over IPC, so fewer statements are faster. */
const INSERT_CHUNK = 50;

async function insertRows(db: SqlDatabase, into: string, rows: unknown[][]): Promise<void> {
  for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
    const chunk = rows.slice(start, start + INSERT_CHUNK);
    const values: unknown[] = [];
    const tuples = chunk.map((row) => {
      const placeholders = row.map((value) => {
        values.push(value);
        return `$${values.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });
    await db.execute(`INSERT INTO ${into} VALUES ${tuples.join(', ')}`, values);
  }
}
