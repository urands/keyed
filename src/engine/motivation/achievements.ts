import { isArray, isOneOf, isRecord } from '../validate';

/** What an achievement measures; the app computes the values. */
export const ACHIEVEMENT_METRICS = [
  'lessons',
  'startMasteredLayouts',
  'openedShare',
  'masteredLayouts',
  'bestCpm',
  'perfectLessons',
  'bestAccurateRun',
  'bestStreak',
  'activeHours',
  'chars',
] as const;
export type AchievementMetric = (typeof ACHIEVEMENT_METRICS)[number];
export type AchievementMetrics = Record<AchievementMetric, number>;

/** One achievement (docs/product.md, "Достижения"); with several levels it is a ladder. */
export interface AchievementDef {
  id: string;
  metric: AchievementMetric;
  /** Thresholds of the levels, ascending. */
  levels: readonly number[];
}

/** A stored achievement: how many levels are reached and when the last one was. */
export interface UnlockedAchievement {
  level: number;
  unlockedAt: number;
}

export interface AchievementUnlock {
  id: string;
  level: number;
}

export function parseAchievements(data: unknown): AchievementDef[] {
  if (!isArray(data)) throw new Error('Achievements: expected an array');
  const ids = new Set<string>();
  return data.map((entry, i): AchievementDef => {
    if (!isRecord(entry) || typeof entry.id !== 'string' || ids.has(entry.id)) {
      throw new Error(`Achievements: entry ${i} needs a unique id`);
    }
    ids.add(entry.id);
    if (!isOneOf(ACHIEVEMENT_METRICS, entry.metric)) {
      throw new Error(`Achievements: ${entry.id} has an unknown metric`);
    }
    const levels = entry.levels;
    if (
      !isArray(levels) ||
      levels.length === 0 ||
      !levels.every(
        (level, j) => typeof level === 'number' && (j === 0 || level > Number(levels[j - 1])),
      )
    ) {
      throw new Error(`Achievements: ${entry.id} needs ascending numeric levels`);
    }
    return { id: entry.id, metric: entry.metric, levels: levels as number[] };
  });
}

/** How many levels the current value reaches. */
export function reachedLevel(def: AchievementDef, metrics: AchievementMetrics): number {
  const value = metrics[def.metric];
  return def.levels.filter((threshold) => value >= threshold).length;
}

/**
 * Levels reached now but not stored yet. A stored level never goes down, so
 * every level is awarded once.
 */
export function newUnlocks(
  defs: readonly AchievementDef[],
  metrics: AchievementMetrics,
  unlocked: Readonly<Record<string, UnlockedAchievement>>,
): AchievementUnlock[] {
  return defs.flatMap((def) => {
    const level = reachedLevel(def, metrics);
    return level > (unlocked[def.id]?.level ?? 0) ? [{ id: def.id, level }] : [];
  });
}

export interface AchievementProgress {
  def: AchievementDef;
  /** Levels awarded so far. */
  level: number;
  unlockedAt: number | null;
  value: number;
  /** Threshold of the next level; null when every level is reached. */
  next: number | null;
}

export function achievementProgress(
  defs: readonly AchievementDef[],
  metrics: AchievementMetrics,
  unlocked: Readonly<Record<string, UnlockedAchievement>>,
): AchievementProgress[] {
  return defs.map((def) => {
    const stored = unlocked[def.id];
    const level = stored?.level ?? 0;
    return {
      def,
      level,
      unlockedAt: stored?.unlockedAt ?? null,
      value: metrics[def.metric],
      next: def.levels[level] ?? null,
    };
  });
}
