import { LAYOUT_IDS } from '../engine/layout/layout';
import type { UnlockedAchievement } from '../engine/motivation/achievements';
import type { DayRecord } from '../engine/motivation/daily';
import type { KeyStat } from '../engine/stats/keyStats';
import { isOneOf, isRecord } from '../engine/validate';
import {
  lessonKeys,
  type LessonRecord,
  type LessonSummary,
  type Storage,
  type StoredData,
} from './types';

interface MemoryData {
  settings: Record<string, unknown>;
  lessons: (LessonRecord & { id: number })[];
  keyStats: Record<string, Record<string, KeyStat>>;
  opened: Record<string, Record<string, number>>;
  days: Record<string, DayRecord>;
  achievements: Record<string, UnlockedAchievement>;
}

/** Where a memory storage keeps a copy between page loads, as one JSON string. */
export interface Persistence {
  load(): string | null;
  save(data: string): void;
}

function emptyData(): MemoryData {
  return { settings: {}, lessons: [], keyStats: {}, opened: {}, days: {}, achievements: {} };
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

    saveOpened(layoutId, stage, opened) {
      (data.opened[layoutId] ??= {})[stage] = opened;
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

    listHistory() {
      const ordered = [...data.lessons].sort((a, b) => a.startedAt - b.startedAt || a.id - b.id);
      return Promise.resolve(
        ordered.map(({ layoutId, startedAt, durationMs, length, errors, cpm, accuracy }) => ({
          layoutId,
          startedAt,
          durationMs,
          length,
          errors,
          cpm,
          accuracy,
        })),
      );
    },

    loadDays() {
      return Promise.resolve(
        Object.values(data.days)
          .map((day) => ({ ...day }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      );
    },

    saveDay(day) {
      data.days[day.date] = { ...day };
      save();
      return Promise.resolve();
    },

    loadAchievements() {
      return Promise.resolve(structuredClone(data.achievements));
    },

    saveAchievement(id, achievement) {
      if (achievement.level > (data.achievements[id]?.level ?? 0)) {
        data.achievements[id] = { ...achievement };
        save();
      }
      return Promise.resolve();
    },

    exportData() {
      const layouts = new Set([...Object.keys(data.keyStats), ...Object.keys(data.opened)]);
      const progress: StoredData['progress'] = {};
      for (const layoutId of layouts) {
        if (!isOneOf(LAYOUT_IDS, layoutId)) continue;
        progress[layoutId] = {
          keyStats: structuredClone(data.keyStats[layoutId] ?? {}),
          opened: { ...data.opened[layoutId] },
        };
      }
      return Promise.resolve({
        settings: structuredClone(data.settings),
        lessons: [...data.lessons]
          .sort((a, b) => a.startedAt - b.startedAt || a.id - b.id)
          .map(
            ({ layoutId, stage, startedAt, durationMs, length, errors, cpm, accuracy, samples }) =>
              structuredClone({
                layoutId,
                stage,
                startedAt,
                durationMs,
                length,
                errors,
                cpm,
                accuracy,
                samples,
              }),
          ),
        progress,
        days: Object.values(data.days)
          .map((day) => ({ ...day }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        achievements: structuredClone(data.achievements),
      });
    },

    importData(imported) {
      const copy = structuredClone(imported);
      data.settings = copy.settings;
      data.lessons = copy.lessons.map((lesson, index) => ({ ...lesson, id: index + 1 }));
      data.keyStats = {};
      data.opened = {};
      for (const [layoutId, progress] of Object.entries(copy.progress)) {
        data.keyStats[layoutId] = progress.keyStats;
        data.opened[layoutId] = progress.opened;
      }
      data.days = Object.fromEntries(copy.days.map((day) => [day.date, day]));
      data.achievements = copy.achievements;
      save();
      return Promise.resolve();
    },

    resetProgress() {
      Object.assign(data, { ...emptyData(), settings: data.settings });
      save();
      return Promise.resolve();
    },
  };
}
