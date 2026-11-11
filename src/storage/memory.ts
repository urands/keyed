import type { KeyStat } from '../engine/stats/keyStats';
import { isRecord } from '../engine/validate';
import { lessonKeys, type LessonRecord, type LessonSummary, type Storage } from './types';

interface MemoryData {
  settings: Record<string, unknown>;
  lessons: (LessonRecord & { id: number })[];
  keyStats: Record<string, Record<string, KeyStat>>;
  opened: Record<string, Record<string, number>>;
}

/** Where a memory storage keeps a copy between page loads, as one JSON string. */
export interface Persistence {
  load(): string | null;
  save(data: string): void;
}

function emptyData(): MemoryData {
  return { settings: {}, lessons: [], keyStats: {}, opened: {} };
}

function restore(persistence: Persistence | undefined): MemoryData {
  try {
    const json = persistence?.load();
    if (!json) return emptyData();
    const data: unknown = JSON.parse(json);
    return isRecord(data) ? { ...emptyData(), ...(data as Partial<MemoryData>) } : emptyData();
  } catch {
    return emptyData();
  }
}

/**
 * Storage in memory, optionally copied to `persistence`. Used by tests and when
 * the interface runs in a plain browser without the desktop shell.
 */
export function createMemoryStorage(persistence?: Persistence): Storage {
  const data = restore(persistence);
  const save = () => {
    try {
      persistence?.save(JSON.stringify(data));
    } catch {
      // The copy is a convenience; the data in memory is still there.
    }
  };

  return {
    loadSettings() {
      return Promise.resolve(structuredClone(data.settings));
    },

    saveSettings(values) {
      Object.assign(data.settings, structuredClone(values));
      save();
      return Promise.resolve();
    },

    loadProgress(layoutId) {
      return Promise.resolve({
        keyStats: structuredClone(data.keyStats[layoutId] ?? {}),
        opened: { ...data.opened[layoutId] },
      });
    },

    saveLesson(lesson, keyStats, opened) {
      const id = (data.lessons.at(-1)?.id ?? 0) + 1;
      data.lessons.push({ ...structuredClone(lesson), id });
      const stats = (data.keyStats[lesson.layoutId] ??= {});
      for (const key of lessonKeys(lesson)) {
        const stat = keyStats[key];
        if (stat) stats[key] = { ...stat };
      }
      (data.opened[lesson.layoutId] ??= {})[lesson.stage] = opened;
      save();
      return Promise.resolve();
    },

    listLessons(layoutId, limit) {
      const lessons = data.lessons
        .filter((lesson) => lesson.layoutId === layoutId)
        .slice(-limit)
        .map(
          ({ id, stage, startedAt, durationMs, length, errors, cpm, accuracy }): LessonSummary => ({
            id,
            stage,
            startedAt,
            durationMs,
            length,
            errors,
            cpm,
            accuracy,
          }),
        );
      return Promise.resolve(lessons);
    },
  };
}
