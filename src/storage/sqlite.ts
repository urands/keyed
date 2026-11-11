import type { LayoutId } from '../engine/layout/layout';
import type { KeyStat } from '../engine/stats/keyStats';
import { encodeSamples } from './samples';
import { lessonKeys, type LessonSummary, type Storage } from './types';

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
  };
}
